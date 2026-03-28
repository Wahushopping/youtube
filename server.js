const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");

const app = express();

app.use(cors());
app.use(express.static("public"));

app.get("/download", (req, res) => {

    const url = req.query.url;

    if (!url) {
        return res.send("No URL");
    }

    res.setHeader(
        "Content-Disposition",
        'attachment; filename="video.mp4"'
    );

   const ytdlp = spawn("yt-dlp", [
    "-f",
    req.query.quality || "18",
    "-o",
    "-",
    url
]);

    ytdlp.stdout.pipe(res);

    ytdlp.stderr.on("data", data => {
        console.log(data.toString());
    });

});

app.get("/formats", (req, res) => {

    const url = req.query.url;

    if (!url) {
        return res.json({ error: "No URL provided" });
    }

    const ytdlp = spawn("yt-dlp", ["-J", url]);

    let data = "";
    let errorData = "";

    ytdlp.stdout.on("data", chunk => {
        data += chunk;
    });

    ytdlp.stderr.on("data", chunk => {
        errorData += chunk.toString();
    });

    ytdlp.on("close", () => {

        // 🔴 If yt-dlp failed
        if (!data) {
            console.log("yt-dlp error:", errorData);
            return res.json({ error: "Failed to fetch video data" });
        }

        let json;

        try {
            json = JSON.parse(data);
        } catch (err) {
            console.log("JSON parse error:", err);
            console.log("RAW DATA:", data);
            return res.json({ error: "Invalid JSON data" });
        }

        // 🔴 Check formats exist
        if (!json.formats) {
            return res.json({ error: "No formats found" });
        }

        let unique = {};
        let formats = [];

        json.formats.forEach(f => {

            if (!f.height) return;

            let q = f.height + "p";

            if (!unique[q]) {

                unique[q] = true;

                let size = f.filesize || f.filesize_approx || 0;

                let sizeMB = size
                    ? (size / 1024 / 1024).toFixed(1) + " MB"
                    : "Unknown";

                formats.push({
                    quality: q,
                    code: f.format_id,
                    size: sizeMB
                });
            }

        });

        formats.sort((a, b) =>
            parseInt(a.quality) - parseInt(b.quality)
        );

        res.json({
            title: json.title,
            thumbnail: json.thumbnail,
            formats: formats
        });

    });

});
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
