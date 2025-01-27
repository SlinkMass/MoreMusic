var user_logged_in = false
var previous_genres = []
var user = undefined
var albumIDs = []
NewGenre = document.getElementById("new_genre_button")
var parameters = new URLSearchParams(window.location.search)

//Set up user data
if (parameters.has("user")) {
    user_logged_in = true
    user = parameters.get("user")
    const loginButton = document.getElementById("loginButton")
    loginButton.innerHTML = "Sign Out"
    loginButton.className = "btn btn-outline-danger"
    loginButton.parentElement.href = "http://127.0.0.1:5500"
    let newCol = document.createElement("div")
    newCol.className = "col mt-5"
    loginButton.parentElement.parentElement.parentElement.appendChild(newCol)
    let library = document.createElement("button")
    library.className = "btn btn-outline-primary"
    library.innerHTML = "Library"
    newCol.appendChild(library)

    //Switch page to display the library (the first 10 songs anyway)
    library.addEventListener("click", async function(event){
        let response = await fetch("/get_songs?" + new URLSearchParams({"user":user}))
        let songs = await response.json()
        let songsJSON = {}
        for (let n = 0; n < songs.length && n < 10; n++){
            songsJSON["song"+String(n+1)] = songs[n]
        }
        songs_on_page(songsJSON)
    })

    //Add the users' stored previous genres
    let response = fetch("/get_genres?" + new URLSearchParams({"user":user}).toString())
        .then(response => response.json())
        
        .then(data => data["previous_genres"].forEach(function(genre){
            previous_genres.push(genre)
            previousGenres = document.getElementById("PrevGenres")
            let NewGenre = document.createElement("button")
            NewGenre.innerHTML = genre
            NewGenre.className = "btn btn-dark"
            previousGenres.appendChild(NewGenre)
            NewGenre.addEventListener("click", async function(event){
                document.getElementById("genre").innerHTML=event.target.innerText
                get_songs(event.target.innerText)
            })
        }))
}

//Add event listeners to see songs from albums
Array.from(document.getElementsByClassName("seeSongs")).forEach(function(element) {
    element.addEventListener("click", async function(event){
        if (event.target.innerHTML == "See Songs") {
            let albumID = albumIDs[Number(event.target.id.slice(-1))-1]
            let response = await fetch("/album_data?" + new URLSearchParams({"id":albumID}))
            if (response.ok) {
                let albumData = await response.json()
                albumData.forEach(function(song){
                    console.log(document.getElementById("duration1"))
                    let albumSongs = document.getElementById("albumSongs" + String(event.target.id.slice(-1)))
                    let curr_song = document.createElement("p")
                    let curr_artists = document.createElement("p")
                    let curr_duration = document.createElement("p")
                    let song_div = document.createElement("div")
                    let duration_div = document.createElement("div")
                    let row_div = document.createElement("div")
                    curr_song.innerHTML = song["name"]
                    curr_artists.innerHTML = song["artists"].toString()
                    curr_duration.innerHTML = song["duration"]
                    curr_song.className = "text-white mb-1"
                    curr_artists.className = "text-white-50 mb-1"
                    curr_duration.className = "text-white mb-1"
                    song_div.className = "col"
                    duration_div.className = "col mt-2"
                    row_div.className = "row mb-1"
                    albumSongs.appendChild(row_div)
                    row_div.appendChild(song_div)
                    row_div.appendChild(duration_div)
                    song_div.appendChild(curr_song)
                    song_div.appendChild(curr_artists)
                    duration_div.appendChild(curr_duration)
                })
                let album_button = document.getElementById("albumButton" + String(event.target.id.slice(-1)))
                album_button.innerHTML = "Hide Songs"
                album_button.className = "btn btn-outline-danger seeSongs"
            }
        } else {
            let album_button = document.getElementById("albumButton" + String(event.target.id.slice(-1)))
            album_button.innerHTML = "See Songs"
            album_button.className = "btn btn-outline-success seeSongs"
            let albumSongs = document.getElementById("albumSongs" + String(event.target.id.slice(-1)))
            albumSongs.innerHTML = ""
        }   
    })
})

//add to library buttons
if (user_logged_in) {
    for (let n = 1; n <= 10; n++) {
        let saveButton = document.getElementById("saveButton" + String(n))
        saveButton.addEventListener("click", async function(event){
            if (saveButton.innerHTML == "+") {
                saveButton.innerHTML = "✓"
                saveButton.className = "btn btn-outline-success"
                fetch("/add_song", {
                    method: "POST",
                    headers: {
                        "Content-Type":"application/json",
                        "user":user
                    },
                    body: JSON.stringify({
                        "name": document.getElementById("song" + String(n)).innerHTML, 
                        "image": document.getElementById("album" + String(n)).src,
                        "artists": document.getElementById("artist" + String(n)).innerHTML,
                        "link": document.getElementById("link" + String(n)).href, 
                        "id": albumIDs[n]
                    })
                })
            } else {
                saveButton.innerHTML = "+"
                saveButton.className = "btn btn-outline-primary"
                let response = fetch("/remove_song?" + new URLSearchParams({"user":user}), {
                    method: "DELETE",
                    headers: {
                        "Content-Type":"application/json",
                        "link":document.getElementById("link" + String(n)).href
                    }
                })
            }
            saveButton.setAttribute("disabled", "disabled")
            setTimeout(() => saveButton.removeAttribute("disabled"), 3000)
        })
    }
}



NewGenre.addEventListener("click", async function(event){
    
    if (document.getElementById("genre").innerText != "" && !previous_genres.includes(document.getElementById("genre").innerText)) {
        AddToGenres(document.getElementById("genre").innerText)
    }
    //Get a new genre
    try{
        let response = await fetch("/new_genre");
        if (! response.ok) {
            throw new Error(response.status);
        }
        let body = await response.text();
        document.getElementById("genre").innerHTML=body;
    } catch(e) {
        alert(e);
    }
    event.target.setAttribute("disabled", "disabled")
    setTimeout(() => event.target.removeAttribute("disabled"), 3000)

    get_songs(document.getElementById("genre").innerText)
});

function songs_on_page(song_data) {
    albumIDs = []
    for (let n = 1; n <= Object.keys(song_data).length; n++) {
        document.getElementById("album"+String(n)).src = song_data["song"+String(n)]["image"]
        document.getElementById("song"+String(n)).innerText = song_data["song"+String(n)]["name"]
        document.getElementById("artist"+String(n)).innerText = song_data["song"+String(n)]["artists"]
        document.getElementById("link"+String(n)).href = song_data["song"+String(n)]["link"]
        albumIDs.push(song_data["song"+String(n)]["albumID"])
    }
    if (Object.keys(song_data).length < 10){
        for (let n = 10; n > Object.keys(song_data).length; n--){
            document.getElementById("album"+String(n)).src = ""
            document.getElementById("song"+String(n)).innerText = ""
            document.getElementById("artist"+String(n)).innerText = ""
        }
    }
}

function AddToGenres(genre) {
    previous_genres.push(genre)
    previousGenres = document.getElementById("PrevGenres")
    let NewGenre = document.createElement("button")
    NewGenre.innerHTML = genre
    NewGenre.className = "btn btn-dark"
    previousGenres.appendChild(NewGenre)
    NewGenre.addEventListener("click", async function(event){
        document.getElementById("genre").innerHTML=event.target.innerText
        get_songs(event.target.innerText)
    })
    if (user_logged_in) {
        let response = fetch("/add_genre", {
            method: "POST",
            headers: {
                "Content-Type":"application/json",
                "user": user
            },
            body: JSON.stringify({"genre": genre}),
        })
    }

}

async function get_songs(genre) {
    console.log(genre)
    //Get songs for the genre
    try{
        let response = await fetch("/search_songs", {
            method: "POST",
            headers: {
                "Content-Type":"application/json"
            },
            body: JSON.stringify({"genre": genre}),

        })
        if (! response.ok) {
            throw new Error(response.status);
        }
        let body = await response.text();
        songs_on_page(JSON.parse(body))
    } catch(e) {
        alert(e);
    }    
}