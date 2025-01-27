import fetch from "node-fetch";
import express from "express";
import fs from "fs";
import "dotenv/config";

//For spotify api
const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET
var token = null
var refresh_token = null
var user_logged_in = false

//NOTE can use app.route for each entity
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
                    let artists = []
                    song["artists"].forEach(function(artist) {
                        artists.push(artist["name"])
                    })
                    songs_response["song"+String(n+1)] = {"name":song["name"], "artists":artists.join(", "), "image":song["album"]["images"][1]["url"], "link":song["external_urls"]["spotify"], "albumID":song["album"]["id"]}
                })
                fs.writeFileSync("./data/cache.json", JSON.stringify(songs_response));
                resolved = true
                break
            }
    }
    if (!resolved) {
        newGenre()
    }
}

app.get("/new_genre", async function(req, resp){
    let genre = JSON.parse(fs.readFileSync("./data/cache.json"))
    await resp.send(genre["genre"])
    newGenre() //finds genre for the next songs
})

app.post("/add_genre", async function(req, resp){
    let genre = req.body.genre
    let user = req.header("user")
    let data = JSON.parse(fs.readFileSync("./data/users.json"))
    if (data[user] != undefined) {
        data[user]["previous_genres"].push(genre)
        fs.writeFileSync("./data/users.json", JSON.stringify(data))
    }
})

app.get("/get_genres", async function(req, resp){
    let user = req.query.user
    let data = JSON.parse(fs.readFileSync("./data/users.json"))
    resp.send(JSON.stringify({"previous_genres": data[user]["previous_genres"]}))
})



app.post("/add_song", async function(req, resp){
    let user = req.header("user")
    let name = req.body.name
    let artists = req.body.artists
    let image = req.body.image
    let link = req.body.link
    let albumID = req.body.id
    let data = JSON.parse(fs.readFileSync("./data/songs.json"))
    if (data[user] == undefined) {
        data[user] = [{"name": name, "artists": artists, "image": image, "link": link, "albumID": albumID}]
    } else {
        data[user].push({"name": name, "artists": artists, "image": image, "link": link, "albumID": albumID})
    }
    fs.writeFileSync("./data/songs.json", JSON.stringify(data))
}) 

app.delete("/remove_song", async function(req, resp){
    let user = req.query.user
    let link = req.header("link")
    let data = JSON.parse(fs.readFileSync("./data/songs.json"))
    for (let n = 0; n < data[user].length; n++) {
        if (data[user][n]["link"] == link) {
            data[user].splice(n, 1)
        }
    }
    fs.writeFileSync("./data/songs.json", JSON.stringify(data))
})

app.get("/get_songs", async function(req, resp){
    let user = req.query.user
    let data = JSON.parse(fs.readFileSync("./data/songs.json"))
    resp.send(JSON.stringify(data[user]))
})

//################SPOTIFY API#################
app.post("/search_songs", async function(req, resp){
    let genre = req.body.genre
    let data = JSON.parse(fs.readFileSync("./data/cache.json"))
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
        if (response.ok) {
            const Fulljson = await response.json();
            let songs = Fulljson["tracks"]["items"]
            let songs_response = {}
            songs.forEach(function(song, n) {
                let artists = []
                song["artists"].forEach(function(artist) {
                    artists.push(artist["name"])
                })
                songs_response["song"+String(n+1)] = {"name":song["name"], "artists":artists, "image":song["album"]["images"][1], "link":song["external_urls"]["spotify"], "albumID":song["album"]["id"]}
            })
            resp.send(JSON.stringify(songs_response))
        } else {
            console.log(response.statusText);
            throw new Error("Error code: ", response.status);
        }
    }
    });

app.get("/album_data", async function (req, resp) {
    let albumID = req.query.id
    console.log(albumID)
    let response = await fetch(`https://api.spotify.com/v1/albums/${albumID}/tracks`, {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + token
        }
    })
    if (response.ok) {
        const jsonResponse = await response.json()
        let res = []
        jsonResponse["items"].forEach(function(song) {
            let artists = []
            song["artists"].forEach(function(artist) {
                artists.push(artist["name"])
            })
            res.push({"name": song["name"], "artists": artists, "duration": String(Math.floor(song["duration_ms"]/60000)) + ":" + Math.floor((song["duration_ms"]%60000)/1000).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})})
        })
        resp.send(res)
    } else {
        throw new Error(response.status);
    }

})


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
//####################USER_ENTITY##################
app.get("/login", async function(req, resp){
    let authUrl = ("https://accounts.spotify.com/authorize?" + new URLSearchParams({
        client_id: client_id,
        response_type: "code",
        redirect_uri: "http://127.0.0.1:5500/callback",
        scope: ["user-read-private"]
    }).toString())
    resp.redirect(authUrl)
})

app.get("/callback", async function(req, resp){
    let code = req.query.code || null;
    let error = req.query.error || null;

    let response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Authorization": "Basic " + (Buffer.from(client_id + ":" + client_secret).toString("base64")),
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            code: code,
            redirect_uri: "http://127.0.0.1:5500/callback",
            grant_type: "authorization_code"
          }).toString()
    })
    if (response.ok) {
        let jsonResponse = await response.json()
        token = jsonResponse["access_token"]
        refresh_token = jsonResponse["refresh_token"]
        user_logged_in = true
        let user_data = await fetch("https://api.spotify.com/v1/me", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token
            }
        })
        if (user_data.ok) {
            let user_data_json = await user_data.json()
            let data = JSON.parse(fs.readFileSync("./data/users.json"))
            if (!(user_data_json["display_name"] in data)) {
                fs.appendFileSync("./data/users.json", JSON.stringify({[user_data_json["display_name"]]: {"id": user_data_json["id"], "product": user_data_json["product"], "previous_genres": []}}))
            }
            resp.redirect("/?" + 
                new URLSearchParams({user: user_data_json["display_name"]})
            )

        } else {
            console.log(await user_data.json())
        }

    } else {
        console.log(await response.json())
    }
})

GetToken()
newGenre()
app.listen(5500);

