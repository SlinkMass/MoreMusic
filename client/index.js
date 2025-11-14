var user_logged_in = false
var previous_genres = []
var user = undefined
var albumIDs = []
NewGenre = document.getElementById("new_genre_button")
var parameters = new URLSearchParams(window.location.search)

//Set up user data
if (parameters.has("user")) {
    setup_user()
}

//Add event listeners to see songs from albums
Array.from(document.getElementsByClassName("seeSongs")).forEach(function(element) {
    element.addEventListener("click", async function(event){
        const r =  new RegExp("\\d+")
        if (event.target.innerHTML == "See Songs") {
            let albumID = albumIDs[Number(event.target.id.match(r))-1]
            let response = await fetch("/api/album_data?" + new URLSearchParams({"id":albumID}))
            if (response.ok) {
                create_album_songs(await response.json(), String(event.target.id.match(r)))
            } else {
                alert("Server is unreachable")
            }
        } else {
            let album_button = document.getElementById("albumButton" + String(event.target.id.match(r)))
            album_button.innerHTML = "See Songs"
            album_button.className = "btn btn-outline-success seeSongs"
            let albumSongs = document.getElementById("albumSongs" + String(event.target.id.match(r)))
            albumSongs.innerHTML = ""
        }   
    })
})



//user stuff
if (user_logged_in) {
    for (let n = 1; n <= 10; n++) {
        let saveButton = document.getElementById("saveButton" + String(n))
        saveButton.addEventListener("click", async function(event){
            if (saveButton.innerHTML == "+") {
                saveButton.innerHTML = "✓"
                saveButton.className = "btn btn-outline-success"
                let response = fetch("/api/add_song", {
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
                        "id": albumIDs[n-1]
                    })
                })
                if (!response.ok) {
                    alert("Server is unreachable")
                }
            } else {
                saveButton.innerHTML = "+"
                saveButton.className = "btn btn-outline-primary"
                let response = fetch("/api/remove_song?" + new URLSearchParams({"user":user}), {
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

    if (document.getElementById("genre").innerText == ""){
        document.getElementById("content").style.display = "block"
        document.getElementById("desc").innerHTML = "Your Next Genre is:"
    }
    
    if (document.getElementById("genre").innerText != "" && !previous_genres.includes(document.getElementById("genre").innerText)) {
        AddToGenres(document.getElementById("genre").innerText)
    }
    //Get a new genre
    try{
        let response = await fetch("/api/new_genre");
        if (! response.ok) {
            alert("Server is unreachable")
        }
        let body = await response.json();
        document.getElementById("genre").innerHTML=body["genre"];
    } catch(e) {
        alert(e);
    }
    event.target.setAttribute("disabled", "disabled")
    setTimeout(() => event.target.removeAttribute("disabled"), 3000)

    get_songs(document.getElementById("genre").innerText)
});


function setup_user() {
    user_logged_in = true
    user = parameters.get("user")
    const loginButton = document.getElementById("loginButton")
    loginButton.innerHTML = "Sign Out"
    loginButton.className = "btn btn-outline-danger"
    loginButton.parentElement.href = "/"
    let newCol = document.createElement("div")
    newCol.className = "col mt-5"
    loginButton.parentElement.parentElement.parentElement.appendChild(newCol)
    let library = document.createElement("button")
    library.className = "btn btn-outline-primary"
    library.innerHTML = "Library"
    newCol.appendChild(library)

    //Switch page to display the library
    library.addEventListener("click", async function(event){

        if (document.getElementById("genre").innerText == ""){
            document.getElementById("content").style.display = "block"
            document.getElementById("desc").innerHTML = "Your Next Genre is:"
        }

        var currPage = 1
        document.getElementById("pageBar").style.display = "flex"
        let response = await fetch("/api/get_songs?" + new URLSearchParams({"user":user}))
        if (response.ok){
            let songs = await response.json()
            let songsJSON = {}
            for (let n = 0; n < songs.length; n++){
                songsJSON["song"+String(n+1)] = songs[n]
            }
            if (Object.entries(songsJSON).length >= 10){
                songs_on_page(Object.fromEntries(Object.entries(songsJSON).slice(0,10)))
            } else {
                songs_on_page(songsJSON)
            }

            for (let n = 0; n < songs.length && n < 10; n++){
                document.getElementById("saveButton" + String(n+1)).className = "btn btn-outline-success"
                document.getElementById("saveButton" + String(n+1)).innerHTML = "✓"
            }

            if (songs.length > 10) {
                previousPage = document.getElementById("previous")
                nextPage = document.getElementById("next")
                nextPage.addEventListener("click", function(event){
                    if (currPage*10 < songs.length) {
                        currPage += 1
                        if (songs.length >= currPage * 10){
                            songs_on_page(Object.fromEntries(Object.entries(songsJSON).slice((currPage-1)*10,(currPage)*10)))
                        } else {
                            songs_on_page(Object.fromEntries(Object.entries(songsJSON).slice((currPage-1)*10,songs.length)))
                        }
                        for (let n = 10*(currPage-1); n < 10*currPage && n < songs.length; n++) {
                            document.getElementById("saveButton" + String(n%10+1)).className = "btn btn-outline-success"
                            document.getElementById("saveButton" + String(n%10+1)).innerHTML = "✓"                    
                        }   
                    }
                })
                previousPage.addEventListener("click", function(event){
                    if (currPage != 1){
                        currPage-=1
                        songs_on_page(Object.fromEntries(Object.entries(songsJSON).slice((currPage-1)*10,(currPage)*10)))
                        for (let n = 0; n < 10*currPage && n < songs.length; n++) {
                            document.getElementById("saveButton" + String(n%10+1)).className = "btn btn-outline-success"
                            document.getElementById("saveButton" + String(n%10+1)).innerHTML = "✓"                    
                        }
                    }
                })
            }
        } else {
            alert("Server is unreachable")
        }
    })

    //Add the users' stored previous genres
    let response = fetch("/api/get_genres?" + new URLSearchParams({"user":user}).toString())
        .then(response => response.json())
        
        .then(data => data["previous_genres"].forEach(function(genre){
            AddToGenres(genre)
            })
        )
}


function create_album_songs(albumData, n) {
    albumData.forEach(function(song){
        let albumSongs = document.getElementById("albumSongs" + n)
        let curr_song = document.createElement("p")
        let curr_artists = document.createElement("p")
        let curr_duration = document.createElement("p")
        let song_div = document.createElement("div")
        let duration_div = document.createElement("div")
        let song_link = document.createElement("a")
        curr_song.innerHTML = song["name"]
        curr_artists.innerHTML = song["artists"].toString()
        curr_duration.innerHTML = song["duration"]
        curr_song.className = "text-white mb-1"
        curr_artists.className = "text-white-50 mb-1"
        curr_duration.className = "text-white mb-1"
        song_div.className = "col"
        duration_div.className = "col mt-2"
        song_link.className = "row mb-1"
        song_link.href = song["link"]
        song_link.target = "_blank"
        albumSongs.appendChild(song_link)
        song_link.appendChild(song_div)
        song_link.appendChild(duration_div)
        song_div.appendChild(curr_song)
        song_div.appendChild(curr_artists)
        duration_div.appendChild(curr_duration)
    })
    let album_button = document.getElementById("albumButton" + n)
    album_button.innerHTML = "Hide Songs"
    album_button.className = "btn btn-outline-danger seeSongs"
}


function songs_on_page(song_data) {
    albumIDs = []
    const r =  new RegExp("\\d+")
    for (let n = Number(Object.keys(song_data)[0].match(r)); n <= Object.keys(song_data).length + Number(Object.keys(song_data)[0].match(r))-1; n++) {
        document.getElementById("fullsong"+String((n-1)%10+1)).style.display = "block"
        document.getElementById("saveButton"+String((n-1)%10+1)).className = "btn btn-outline-primary"
        document.getElementById("saveButton"+String((n-1)%10+1)).innerHTML = "+"
        document.getElementById("album"+String((n-1)%10+1)).src = song_data["song"+String(n)]["image"]
        document.getElementById("song"+String((n-1)%10+1)).innerText = song_data["song"+String(n)]["name"]
        document.getElementById("artist"+String((n-1)%10+1)).innerText = song_data["song"+String(n)]["artists"]
        document.getElementById("link"+String((n-1)%10+1)).href = song_data["song"+String(n)]["link"]
        albumIDs.push(song_data["song"+String(n)]["albumID"])
        document.getElementById("albumSongs"+String((n-1)%10+1)).innerHTML = ""
    }
    if (Object.keys(song_data).length < 10){
        for (let n = 10; n > Object.keys(song_data).length; n--){
            document.getElementById("fullsong"+String(n)).style.display = "none"
            document.getElementById("saveButton"+String(n)).className = "btn btn-outline-primary"
            document.getElementById("saveButton"+String(n)).innerHTML = "+"
            document.getElementById("album"+String(n)).src = ""
            document.getElementById("song"+String(n)).innerText = ""
            document.getElementById("artist"+String(n)).innerText = ""
            document.getElementById("albumSongs"+String(n)).innerHTML = ""
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

        if (document.getElementById("genre").innerText == ""){
            document.getElementById("content").style.display = "block"
            document.getElementById("desc").innerHTML = "Your Next Genre is:"
        }

        document.getElementById("genre").innerHTML=event.target.innerText

        get_songs(event.target.innerText)
    })
    if (user_logged_in && document.getElementById("genre").innerText != "") {
        let response = fetch("/api/add_genre", {
            method: "POST",
            headers: {
                "Content-Type":"application/json",
                "user": user
            },
            body: JSON.stringify({"genre": genre}),
        })
        if (!response.ok){
            alert("Server is unreachable")
        }
    }

}

async function get_songs(genre) {
    //Get songs for the genre
    
    try{
        let response = await fetch("/api/search_songs", {
            method: "POST",
            headers: {
                "Content-Type":"application/json"
            },
            body: JSON.stringify({"genre": genre, "limit":10}),

        })
        if (! response.ok) {
            alert("Server is unreachable")
        }
        let body = await response.text();
        songs_on_page(JSON.parse(body))
    } catch(e) {
        alert(e);
    }    
}