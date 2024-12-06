const { Client, GatewayIntentBits } = require('discord.js');
const ytSearch = require('yt-search'); // Para buscar canciones en YouTube
const config = require('./config.json');
const axios = require('axios');
const qs = require('qs');
const Monitor=require('ping-monitor')
const express=require('express')
const server=express();

server.all("/", (req,res)=>{
    res.send("bot encendido")
})

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

console.log("bot arrancó")

/*keepAlive();

const monitor=new Monitor({
    website: "s3://bot-natalio-ruiz",
    title: "natalio",
    interval: 5
});

monitor.on('up', (res) => console.log(`${res.website} esta encendido`))
monitor.on('down', (res) => console.log(`${res.website} esta caido - ${res.statusMessage}`))
monitor.on('stop', (res) => console.log(`${res.website} se frenó`))
monitor.on('error', (error) => console.log(error))
*/

const CLIENT_ID = config.client_id;
const CLIENT_SECRET = config.client_secret;

const songRegex = /cancion:\s*(.+)/i;
const videoRegex= /video:\s*(.+)/i;
const movieRegex = /pelicula:\s*(.+)/i;

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if(message.content=="hola"){
        message.channel.send("holiwis");
    }

    // Comprobar si el mensaje coincide con el formato del contenido audiovisual;
    const matchSong = message.content.match(songRegex);
    const matchVideo = message.content.match(videoRegex);
    const matchMovie = message.content.match(movieRegex);

    if (matchVideo) {
        const videoName = matchVideo[1]; // Extrae el nombre de la canción

        // Buscar la canción en YouTube
        const video = await searchYouTube(videoName);
        if (!video) {
            message.channel.send('No se pudo encontrar el archivo.');
            return;
        }

        // Responder con el enlace de YouTube
        message.channel.send(`Se recomienda: ${video.title} - ${video.url}`);
    }
    if (matchSong) {
        const songName = matchSong[1]; // Extrae el nombre de la canción
    
        try {
            const token = await getSpotifyAccessToken();
            const songData = await searchSpotify(songName, token);
    
            if (!songData || songData.length === 0) {
                message.channel.send("No se encontró la canción en Spotify.");
                return;
            }
    
            const track = songData.name;
            const artists = Array.isArray(songData.artists) 
                ? songData.artists.map(artist => artist.name).join(", ") 
                : "Artista desconocido";
    
            message.channel.send(`Se recomienda: ${track} de ${artists}\n ${songData.url}`);
        } catch (error) {
            console.error("Error al buscar en Spotify:", error);
            message.channel.send("Hubo un problema al buscar en Spotify.");
        }
    }
    if(matchMovie){
        const movieName = matchMovie[1]; // Extrae el nombre de la película
        try {
            const movieData = await searchIMDB(movieName);
            if (!movieData) {
                message.channel.send("No se encontró la película.");
                return;
            }
            message.channel.send(`Se recomienda: ${movieData.Title} (${movieData.Year})\n ${movieData.Plot}\n ${movieData.URL}`);
        } catch (error) {
            console.error("Error al buscar en IMDb:", error);
            message.channel.send("Hubo un problema al buscar la película.");
        }
    }
});

function keepAlive(){
    server.listen(3000, () => {
        console.log("bot listo")
    })
}

// Buscar la canción en YouTube
async function searchYouTube(songName) {
    const result = await ytSearch(songName);
    return result.videos.length > 0 ? result.videos[0] : null;
}

async function getSpotifyAccessToken() {
    const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        qs.stringify({ grant_type: 'client_credentials' }),
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
            },
        }
    );
    return response.data.access_token;
}

async function searchSpotify(songName) {
    try {
        const accessToken = await getSpotifyAccessToken();
        const response = await axios.get(`https://api.spotify.com/v1/search`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: {
                q: songName,
                type: 'track',
                limit: 1,
            },
        });

        const track = response.data.tracks.items[0];
        if (track) {
            return {
                name: track.name,
                artists: track.artists.map((artist) => artist.name).join(', '),
                url: track.external_urls.spotify,
            };
        }
        return null;
    } catch (error) {
        console.error('Error al buscar en Spotify:', error);
        return null;
    }
}

async function searchIMDB(movieName) {
    try {
        const response = await axios.get('https://www.omdbapi.com/', {
            params: {
                t: movieName,  // El nombre de la película
                apikey: config.imdb_key,  // La clave de tu API
            },
        });

        if (response.data.Response === 'True') {
            return {
                Title: response.data.Title,
                Year: response.data.Year,
                Plot: response.data.Plot,
                URL: `https://www.imdb.com/title/${response.data.imdbID}/`,
            };
        }
        return null;
    } catch (error) {
        console.error('Error al buscar en IMDb:', error);
        return null;
    }
}


client.login(config.token);