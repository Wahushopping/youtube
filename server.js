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

const ytdlp = spawn("python3", [
    "-m",
    "yt_dlp",
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

    const ytdlp = spawn("python3", ["-m", "yt_dlp", "-J", url]);

    let data = "";
    let errorData = "";

    ytdlp.stdout.on("data", chunk => {
        data += chunk;
    });

    ytdlp.stderr.on("data", chunk => {
        errorData += chunk.toString();
    });

    ytdlp.on("close", () => {

        // ❌ If no data → yt-dlp failed
        if (!data) {
            console.log("ERROR:", errorData);
            return res.json({ error: "yt-dlp failed" });
        }

        let json;

        try {
            json = JSON.parse(data);
        } catch (e) {
            console.log("PARSE ERROR:", e);
            console.log("RAW:", data);
            return res.json({ error: "Invalid JSON" });
        }

        if (!json || !json.formats) {
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
            formats
        });

    });

});
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
