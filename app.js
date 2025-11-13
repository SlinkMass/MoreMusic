import fetch from "node-fetch";
import express from "express";
import fs from "fs";
import path from "path";
import "dotenv/config";
//for testers there is a test account with the email divon29838@gufutu.com and the password TEST123456 on spotify which can be used to login with the
//login button. it has userID 31cdzjpsezde2tehs5e7eik65c4u and is a temporary email.

//For spotify api
const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET
var token = null
var refresh_token = null
var user_logged_in = false

//NOTE can use app.route for each entity
export const app = express();
app.use(express.json());

// Serve static files from client folder
app.use(express.static(path.join(__dirname, "client")));

// Catch-all route for frontend routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "index.html"));
});

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
                fs.writeFileSync(path.join(__dirname,"data","cache.json"), JSON.stringify(songs_response));
                resolved = true
                break
            }
    }
    if (!resolved) {
        newGenre()
    }
}

app.get("/new_genre", async function(req, resp){
    let genre = JSON.parse(fs.readFileSync(path.join(__dirname,"data","cache.json")))
    if (genre["genre"] != undefined) {
    await resp.send({"genre": genre["genre"]})
    } else {
        resp.status(500).json({message: "Unknown Server Error"})
    }
    newGenre() //finds genre for the next songs
})

app.post("/add_genre", async function(req, resp){
    let genre = req.body.genre
    let user = req.header("user")
    if (user == undefined || genre == undefined) {
        resp.status(400).json({message: "Bad Request"})
    } else {
        let data = JSON.parse(fs.readFileSync(path.join(__dirname,"data","users.json")))
        if (data[user] != undefined) {
            data[user]["previous_genres"].push(genre)
            fs.writeFileSync(path.join(__dirname,"data","users.json"), JSON.stringify(data))
            resp.status(200).json({message: "ok"})
        } else {
            resp.status(403).json({message: "Invalid User"})
        }
    }
})

app.get("/get_genres", async function(req, resp){
    let user = req.query.user
    let data = JSON.parse(fs.readFileSync(path.join(__dirname,"data","users.json")))
    if (user == undefined){
        resp.status(400).json({message: "Bad Request"})
    } else if (data[user] == undefined){
        resp.status(403).json({message: "Invalid User"})
    } else {
        resp.send({"previous_genres": data[user]["previous_genres"]})
    }
})



app.post("/add_song", async function(req, resp){
    let user = req.header("user")
    let name = req.body.name
    let artists = req.body.artists
    let image = req.body.image
    let link = req.body.link
    let albumID = req.body.id
    if (albumID == undefined || link == undefined || image == undefined || artists == undefined || name == undefined || user == undefined) {
        resp.status(400).json({message: "Bad Request"})
    } else {
        let data = JSON.parse(fs.readFileSync(path.join(__dirname,"data","songs.json")))
        if (data[user] == undefined) {
            data[user] = [{"name": name, "artists": artists, "image": image, "link": link, "albumID": albumID}]
        } else {
            data[user].push({"name": name, "artists": artists, "image": image, "link": link, "albumID": albumID})
        }
        fs.writeFileSync(path.join(__dirname,"data","songs.json"), JSON.stringify(data))
        resp.status(200).json({message: "ok"})
    }
}) 

app.delete("/remove_song", async function(req, resp){
    let user = req.query.user
    let link = req.header("link")
    let data = JSON.parse(fs.readFileSync(path.join(__dirname,"data","songs.json")))
    if (user == undefined || link == undefined) {
        resp.status(400).json({message: "Bad Request"})
    } else if (data[user] == undefined){
        resp.status(403).json({message: "Invalid User"})
    } else {
        for (let n = 0; n < data[user].length; n++) {
            if (data[user][n]["link"] == link) {
                data[user].splice(n, 1)
            }
        }
        fs.writeFileSync(path.join(__dirname,"data","songs.json"), JSON.stringify(data))
        resp.status(200).json({message: "ok"})
    }
})

app.get("/get_songs", async function(req, resp){
    let user = req.query.user
    if (user == undefined){
        resp.status(400).json({message: "Bad Request"})
    } else {
        let data = JSON.parse(fs.readFileSync(path.join(__dirname,"data","songs.json")))
        if (data[user] != undefined){
            resp.send(data[user])
        } else {
            resp.status(403).json({message: "Invalid User"})
        }
    }
})

//################SPOTIFY API#################
app.post("/search_songs", async function(req, resp){
    let genre = req.body.genre
    let limit = Number(req.body.limit)
    let data = JSON.parse(fs.readFileSync(path.join(__dirname,"data","cache.json")))
    if (genre != undefined && limit != undefined && !isNaN(limit)) {
        if (data["genre"] == genre) {
            delete data["genre"]
            resp.send(data)
        } else {
            SearchForSong(genre, limit, resp)
        }
    } else {
        resp.status(400).json({message: "Bad Request"})
    }
});


async function SearchForSong(genre, limit, resp){
    let response = await fetch(`https://api.spotify.com/v1/search?q=genre:${genre}&type=track&limit=${Math.min(limit, 15)}`, {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + token
        }
    })
    if (response.ok) {
        const Fulljson = await response.json();
        let songs = Fulljson["tracks"]["items"]
        if (songs.length != 0){
            let songs_response = {}
            songs.forEach(function(song, n) {
                let artists = []
                song["artists"].forEach(function(artist) {
                    artists.push(artist["name"])
                })
                songs_response["song"+String(n+1)] = {"name":song["name"], "artists":artists, "image":song["album"]["images"][1]["url"], "link":song["external_urls"]["spotify"], "albumID":song["album"]["id"]}
            })
            resp.send(songs_response)
        } else {
            resp.status(500).json({message: "No Songs for Genre found"})
        }
    } else if (response.status == 429){
        resp.status(429).json({message: "Rate Limit Reached"})
    } else if (response.status == 401){
        GetToken()
        SearchForSong(genre, limit, resp)
    }
}


app.get("/album_data", async function (req, resp) {
    let albumID = req.query.id
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
            res.push({"name": song["name"], "artists": artists, "link":song["external_urls"]["spotify"], "duration": String(Math.floor(song["duration_ms"]/60000)) + ":" + Math.floor((song["duration_ms"]%60000)/1000).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})})
        })
        resp.send(res)
    } else {
        if (response.status == 400){
            resp.status(400).json({message: "Invalid or missing ID"})
        } else if (response.status == 429){
            resp.status(429).json({message: "Rate Limit Reached"})
        } else {
            resp.status(500).json({message: "Unknown server error"})
        }
    }
})


export async function GetToken() {
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
        //If this fails server cannot run so throw error
        console.log(response.statusText);
        throw new Error("Error code: ", response.status);
    }
}
//####################USER_ENTITY##################
app.post("/add_user", async function(req, resp){
    let user = req.body.user
    if (user == undefined){
        resp.status(400).json({message: "Bad Request"})
    } else {
        let response = await fetch("https://api.spotify.com/v1/users/" + user, { 
            headers: {
                "Authorization": "Bearer " + token
            }
        })
        if (response.ok) {
            let user_data_json = await response.json()
            let data = JSON.parse(fs.readFileSync(path.join(__dirname,"data","users.json")))
            if (!(user_data_json["id"] in data)) {
                data[user_data_json["id"]] = {"name": user_data_json["display_name"], "previous_genres": []}
                fs.writeFileSync(path.join(__dirname,"data","users.json"), JSON.stringify(data))
            }
            resp.status(200).json({message: "ok"})
        } else if (response.status == 429){
            resp.status(429).json({message: "Rate Limit Reached"})
        } else {
            resp.status(403).json({message: "Invalid User"})
        }
    }
})

app.get("/get_users", function(req, resp){
    let data = JSON.parse(fs.readFileSync(path.join(__dirname,"data","users.json")))
    resp.send(Object.keys(data))
})

app.get("/user_data", function(req, resp){
    let user = req.query.user
    if (user == undefined){
        resp.status(400).json({message: "Bad Request"})
    } else {
        let data = JSON.parse(fs.readFileSync(path.join(__dirname,"data","users.json")))
        if (data[user] != undefined){
            resp.send(data[user])
        } else {
            resp.status(403).json({message: "Invalid User"})
        }
    }
})

app.get("/login", async function(req, resp){
    let authUrl = ("https://accounts.spotify.com/authorize?" + new URLSearchParams({
        client_id: client_id,
        response_type: "code",
        redirect_uri: process.env.REDIRECT_URI,
        scope: ["user-read-private"]
    }).toString())
    resp.redirect(authUrl)
})

//Only use via /login
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
            redirect_uri: process.env.REDIRECT_URI,
            grant_type: "authorization_code"
          }).toString()
    })
    if (response.ok) {
        let jsonResponse = await response.json()
        token = jsonResponse["access_token"]
        refresh_token = jsonResponse["refresh_token"]
        user_logged_in = true
        console.log(token)
        let user_data = await fetch("https://api.spotify.com/v1/me", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token
            }
        })
        if (user_data.ok) {
            let user_data_json = await user_data.json()
            let data = JSON.parse(fs.readFileSync(path.join(__dirname,"data","users.json")))
            if (!(user_data_json["id"] in data)) {
                data[user_data_json["id"]] = {"name": user_data_json["display_name"], "previous_genres": []}
                fs.writeFileSync(path.join(__dirname,"data","users.json"), JSON.stringify(data))
            }
            resp.redirect("/?" + 
                new URLSearchParams({user: user_data_json["id"]})
            )

        } else {
            console.log("no_user", await user_data.json())
            //User not in spotify database
            resp.redirect("/#")
        }

    } else {
        console.log("no_authentication")
        //Authentication unsuccessful
        resp.redirect("/#")
    }
})

GetToken()
newGenre()


