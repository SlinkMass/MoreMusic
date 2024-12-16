
NewGenre = document.getElementById("new_genre_button")
NewGenre.addEventListener('click', async function(event){
    try{
        let response = await fetch('http://127.0.0.1:5500/new_genre');
        if (! response.ok) {
            throw new Error(response.status)
        }
        let body = await response.text();
        console.log(body)
        document.getElementById('genre').innerHTML=body;
    } catch(e) {
        alert(e);
    }
});