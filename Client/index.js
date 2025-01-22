
previousGenresArr = []
NewGenre = document.getElementById("new_genre_button")
NewGenre.addEventListener("click", async function(event){
    
    if (document.getElementById("genre").innerText != "Genre Here..." && !(previousGenresArr.includes(document.getElementById("genre").innerText))){
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

    get_songs(document.getElementById("genre").innerText)
});


function songs_on_page(song_data) {
    for (let n = 1; n <= Object.keys(song_data).length; n++) {
        document.getElementById("album"+String(n)).src = song_data["song"+String(n)]["image"]["url"]
        document.getElementById("song"+String(n)).innerText = song_data["song"+String(n)]["name"]
        document.getElementById("artist"+String(n)).innerText = song_data["song"+String(n)]["artist"]
        document.getElementById("fullsong"+String(n)).addEventListener("click", function(event){
            window.open(song_data["song"+String(n)]["link"],"_blank")
        })
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
    previousGenres = document.getElementById("PrevGenres")
    let NewGenre = document.createElement("p")
    NewGenre.innerHTML = genre
    NewGenre.className = "previous_genres"
    previousGenres.appendChild(NewGenre)
    previousGenresArr.push(genre)
    NewGenre.addEventListener("click", async function(event){
        document.getElementById("genre").innerHTML=event.target.innerText
        get_songs(event.target.innerText)
    })
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