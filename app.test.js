import request from "supertest";
import { app, GetToken } from "./app.js";
import fs from "fs";

//Note for testing users I have made a dud spotify account, with email divon29838@gufutu.com, password TEST123456 and UserID 31cdzjpsezde2tehs5e7eik65c4u
//testers are allowed to use this acc for testing/reviewing (email is a temporary one).

fs.writeFileSync("./data/songs.json", "{}")
fs.writeFileSync("./data/users.json", "{}")

describe("POST /add_song", () => {

    describe("Given a valid song", () => {

        let data = {"name": "song_name", "artists": "song_artist", "image": "image_link", "link": "link", "id": "album_id"}

        it("Should return 200", () => {
            return request(app)
            .post("/add_song")
            .set("user", "test_user")
            .send(data)
            .expect(200)
        })
    })
})

describe("GET /get_songs", () => {

    describe("Given a valid user", () => {

        it("should return 200 + data", () => {
            return request(app)
                .get("/get_songs?user=test_user")
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res){
                    if (!res.body[0].hasOwnProperty("name")) throw new Error("Expected name key!");
                    if (!res.body[0].hasOwnProperty("artists")) throw new Error("Expected artists key!");
                    if (!res.body[0].hasOwnProperty("image")) throw new Error("Expected image key!");
                    if (!res.body[0].hasOwnProperty("link")) throw new Error("Expected link key!");
                    if (!res.body[0].hasOwnProperty("albumID")) throw new Error("Expected id key!");
                })
        });
    })
})

describe("DELETE /remove_song", () => {

    describe("Given a valid song_link", () => {

        it("Should return 200", () => {
            return request(app)
            .delete("/remove_song?user=test_user")
            .set("link", "link")
            .expect(200)
        })
    })
})

describe("POST /search_songs", () => {

    describe("Given a valid limit and genre", () => {

        let data = {"genre": "rock", "limit": 10}

        it("Should return {limit} songs", () => {
            return request(app)
            .post("/search_songs")
            .send(data)
            .expect(200)
            .expect('Content-Type', /json/)
            .expect(function(res){
                if (!res.body["song1"].hasOwnProperty("name")) throw new Error("Expected name key!");
                if (!res.body["song1"].hasOwnProperty("artists")) throw new Error("Expected artists key!");
                if (!res.body["song1"].hasOwnProperty("image")) throw new Error("Expected image key!");
                if (!res.body["song1"].hasOwnProperty("link")) throw new Error("Expected link key!");
                if (!res.body["song1"].hasOwnProperty("albumID")) throw new Error("Expected id key!");
                if (!Object.keys(res.body).length == 10) throw new Error("Expected length of 10!");
            })            
        })
    })
})

describe("POST /add_user", () => {

    describe("Given a valid user", () => {

        let data = {"user": "31cdzjpsezde2tehs5e7eik65c4u"}

        it("Should return 200", () => {
            return request(app)
            .post("/add_user")
            .send(data)
            .expect(200)
        })
    })
})

describe("GET /user_data", () => {

    describe("Given a valid user", () => {

        it("should return 200 + data", () => {
            return request(app)
                .get("/user_data?user=31cdzjpsezde2tehs5e7eik65c4u")
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res){
                    if (!res.body.hasOwnProperty("name")) throw new Error("Expected name key!");
                    if (!res.body.hasOwnProperty("previous_genres")) throw new Error("Expected previous genres key!");
                })
        });
    })
})

describe("GET /get_users", () => {

    describe("Given Nothing", () => {

        it("should return 200 + data", () => {
            return request(app)
                .get("/get_users")
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res){
                    if (!res.body.length > 0) throw new Error("Expected name key!");
                })
        });
    })
})

describe("POST /add_genre", () => {

    describe("Given a valid user and genre", () => {

        let data = {"genre": "rock"}

        it("Should return 200", () => {
            return request(app)
            .post("/add_genre")
            .set("user", "31cdzjpsezde2tehs5e7eik65c4u")
            .send(data)
            .expect(200)
        })
    })
})

describe("GET /get_genres", () => {

    describe("Given the user", () => {

        it("should return 200 + data", () => {
            return request(app)
                .get("/get_genres?user=31cdzjpsezde2tehs5e7eik65c4u")
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res){
                    if (!res.body.hasOwnProperty("previous_genres")) throw new Error("Expected previous genres key!");
                })
        });
    })
})

describe("GET /new_genre", () => {

    describe("Given nothing", () => {

        it("should return 200 + data", () => {
            return request(app)
                .get("/new_genre")
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res){
                    if (!res.body.hasOwnProperty("genre")) throw new Error("Expected previous genres key!");
                })
        });
    })
})

describe("GET /album_data", () => {

    describe("Given a valid albumID", () => {


        it("should return 200 + data", () => {
            return request(app)
                .get("/album_data?id=2Kh43m04B1UkVcpcRa1Zug")
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function(res){
                    if (res.body.length < 1) throw new Error ("Expected array output!");
                    if (!res.body[0].hasOwnProperty("name")) throw new Error("Expected name key!");
                    if (!res.body[0].hasOwnProperty("artists")) throw new Error("Expected artists key!");
                    if (!res.body[0].hasOwnProperty("duration")) throw new Error("Expected image key!");
                    if (!res.body[0].hasOwnProperty("link")) throw new Error("Expected link key!");
                })
        });
    })
})









//NOTE: Testing /login is not possible from here as it redirects and requires user input on the spotify authentication site.


