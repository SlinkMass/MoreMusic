import fetch from "node-fetch";
import express from "express";
import fs from "fs";


const app = express();
app.use(express.static("client"));

app.get("/new_genre", async function(req, resp){
    const response = await fetch('https://binaryjazz.us/wp-json/genrenator/v1/genre/1');
    const data = await response.json();
    await resp.send(data)
    let genreText = {"genre": data}
    fs.writeFileSync("./data/genre.json", JSON.stringify(genreText));
})

app.listen(5500);

