import fetch from "node-fetch";
import express from "express";
import fs from "fs";
import "dotenv/config";

//For spotify api
const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET
var token

const app = express();
app.use(express.json());
app.use(express.static("client"));

async function newGenre() {
    //Here we must find a genre that has some search results with spotify (roughly a fifth of them do so can take some time)
    const response = await fetch("https://binaryjazz.us/wp-json/genrenator/v1/genre/5");
    const genres = await response.json();
    //Here we must determine if any of these genres resolve
    let resolved = false
    for (let n = 0; n<genres.length; n++){
            let genreText = {"genre": genres[n]}
            let resp = await fetch(`https://api.spotify.com/v1/search?q=genre:${genres[n]}&type=track&limit=10`, {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + token
                }
            })
            let jsonResponse = await resp.json()
            let songs = await (jsonResponse)["tracks"]["items"]
            if (await songs.length != 0) {
                //If so write it to the file and break from the loop
                //Write songs to a "cache" for quick retrieval
                let songs_response = {"genre": genres[n]}
                songs.forEach(function(song, n) {
                    songs_response["song"+String(n+1)] = {"name":song["name"], "artist":song["artists"][0]["name"], "image":song["album"]["images"][1], "link":song["external_urls"]["spotify"]}
                })
                fs.writeFileSync("./data/songs.json", JSON.stringify(songs_response));
                resolved = true
                break
            }
    }
    if (!resolved) {
        newGenre()
    }
}

app.get("/new_genre", async function(req, resp){
    let genre = JSON.parse(fs.readFileSync("./data/songs.json"))
    await resp.send(genre["genre"])
    newGenre() //finds genre for the next songs
})

app.get("/song_data", )

app.post("/search_songs", async function(req, resp){
    let genre = req.body.genre
    let data = JSON.parse(fs.readFileSync("./data/songs.json"))
    if (data["genre"] == genre) {
        delete data["genre"]
        resp.send(JSON.stringify(data))
    } else {
        let response = await fetch(`https://api.spotify.com/v1/search?q=genre:${genre}&type=track&limit=10`, {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token
            }
        })
        if (response.ok || mode=="cache") {
            const Fulljson = await response.json();
            let songs = Fulljson["tracks"]["items"]
            let songs_response = {}
            songs.forEach(function(song, n) {
                songs_response["song"+String(n+1)] = {"name":song["name"], "artist":song["artists"][0]["name"], "image":song["album"]["images"][1], "link":song["external_urls"]["spotify"]}
            })
            resp.send(JSON.stringify(songs_response))
        } else {
            console.log(response.statusText);
            throw new Error("Error code: ", response.status);
        }
    }
    });

async function GetToken() {
    let response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Authorization": "Basic " + (Buffer.from(client_id + ":" + client_secret).toString("base64")),
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials",
        json: true
    });
    if (response.ok) {
        const jsonResponse = await response.json();
        token = jsonResponse["access_token"]
    } else {
        console.log(response.statusText);
        throw new Error("Error code: ", response.status);
    }

}

GetToken()
newGenre()
app.listen(5500);

