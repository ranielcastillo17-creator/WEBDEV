const grid = document.getElementById("gameGrid");
const filters = document.getElementById("filters");
const search = document.getElementById("search");
const emptyState = document.getElementById("emptyState");

let games = [];
let activeGenre = "All";

// Load the JSON data (needs GitHub Pages or a local server, not file://)
fetch("games.json")
    .then(res => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
    })
    .then(data => {
        games = data;
        buildFilters();
        render();
    })
    .catch(err => {
        console.error("Could not load games.json:", err);
        emptyState.textContent = "Could not load games.json. Open this page through a web server or GitHub Pages.";
        emptyState.style.display = "block";
    });

function esc(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
}

function buildFilters() {
    const genres = ["All", ...new Set(games.map(g => g.genre))];
    genres.forEach(genre => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-filter" + (genre === "All" ? " active" : "");
        btn.textContent = genre;
        btn.addEventListener("click", () => {
            activeGenre = genre;
            filters.querySelectorAll(".btn-filter").forEach(b => b.classList.toggle("active", b === btn));
            render();
        });
        filters.appendChild(btn);
    });
}

function cardHTML(g) {
    const [c1, c2] = g.colors || ["#9ACCFC", "#1b365f"];
    const cover = g.image
        ? `<img src="${esc(g.image)}" alt="${esc(g.title)} cover" loading="lazy">`
        : `<h3 class="game-title">${esc(g.title)}</h3><span class="game-genre">${esc(g.genre)}</span>`;
    const links = g.links.map(l =>
        `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a></li>`
    ).join("");

    return `
    <article class="game-card" tabindex="0">
        <div class="game-cover" style="--c1:${c1};--c2:${c2}">${cover}</div>
        <div class="game-overlay">
            <h3 class="overlay-title">${esc(g.title)}</h3>
            <p class="overlay-meta">${esc(g.genre)} · ${g.year}<br>${esc(g.platform)}</p>
            <ul class="overlay-links">${links}</ul>
        </div>
    </article>`;
}

function render() {
    const q = search.value.trim().toLowerCase();
    const list = games.filter(g =>
        (activeGenre === "All" || g.genre === activeGenre) &&
        (g.title.toLowerCase().includes(q) || g.genre.toLowerCase().includes(q))
    );
    grid.innerHTML = list.map(cardHTML).join("");
    emptyState.textContent = "No games found.";
    emptyState.style.display = list.length ? "none" : "block";
}

search.addEventListener("input", render);
