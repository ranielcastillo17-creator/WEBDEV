(function () {
    "use strict";

    var JSON_URL = "games.json";

    var track = document.getElementById("gameTrack");
    var stage = document.getElementById("gameStage");
    var prevBtn = document.getElementById("prevBtn");
    var nextBtn = document.getElementById("nextBtn");
    var counter = document.getElementById("gameCounter");

    var games = [];
    var cards = [];
    var current = 0;

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    function renderCover(game) {
        var cover = el("div", "ratio ratio-1x1 game-cover mb-3");

        function placeholder() {
            cover.innerHTML = "";
            var ph = el("div", "d-flex align-items-center justify-content-center game-cover__empty");
            ph.appendChild(el("i", "fa-solid fa-gamepad"));
            cover.appendChild(ph);
        }

        if (!game.image) {
            placeholder();
            return cover;
        }

        var img = el("img");
        img.src = game.image;
        img.alt = game.title + " cover";
        img.loading = "lazy";
        img.addEventListener("error", placeholder);
        cover.appendChild(img);
        return cover;
    }

    function renderCard(game, index) {
        var card = el("article", "game-card");
        card.tabIndex = 0;
        card.setAttribute("role", "group");
        card.setAttribute("aria-roledescription", "slide");
        card.setAttribute("aria-label", game.title);

        card.appendChild(renderCover(game));
        card.appendChild(el("h2", "h4 fw-bold grotesque-font mb-1", game.title));
        card.appendChild(el("p", "game-developer neon-font fw-semibold mb-3", game.developer));

        card.appendChild(el("p", "game-meta neon-font mb-1", "Genre: " + game.genre));
        card.appendChild(el("p", "game-meta neon-font mb-1", "Platforms: " + (game.platforms || []).join(", ")));
        card.appendChild(el("p", "game-meta neon-font mb-3", "Released: " + game.released));

        var status = (game.status || "").toLowerCase();
        var pill = el("span", "game-status neon-font game-status--" + status, game.status);
        card.appendChild(pill);

        card.addEventListener("click", function () { goTo(index); });
        card.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goTo(index);
            }
        });
        return card;
    }

    function update() {
        cards.forEach(function (card, i) {
            var offset = i - current;
            card.style.setProperty("--offset", offset);
            card.classList.toggle("is-active", offset === 0);
            card.classList.toggle("is-hidden", Math.abs(offset) > 2);
            card.setAttribute("aria-hidden", offset === 0 ? "false" : "true");
            card.tabIndex = offset === 0 ? 0 : -1;
        });
        prevBtn.disabled = current === 0;
        nextBtn.disabled = current === games.length - 1;
        counter.textContent = (current + 1) + " / " + games.length;
    }

    function goTo(index) {
        current = Math.max(0, Math.min(games.length - 1, index));
        update();
    }

    function showMessage(text) {
        track.innerHTML = "";
        var msg = el("p", "game-message neon-font", text);
        msg.setAttribute("role", "status");
        track.appendChild(msg);
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        counter.textContent = "";
    }

    function setupControls() {
        prevBtn.addEventListener("click", function () { goTo(current - 1); });
        nextBtn.addEventListener("click", function () { goTo(current + 1); });

        document.addEventListener("keydown", function (e) {
            if (e.key === "ArrowLeft") goTo(current - 1);
            if (e.key === "ArrowRight") goTo(current + 1);
        });

        // Swipe support
        var startX = null;
        stage.addEventListener("pointerdown", function (e) { startX = e.clientX; });
        stage.addEventListener("pointerup", function (e) {
            if (startX === null) return;
            var diff = e.clientX - startX;
            startX = null;
            if (Math.abs(diff) > 50) goTo(current + (diff < 0 ? 1 : -1));
        });
        stage.addEventListener("pointercancel", function () { startX = null; });
    }

    fetch(JSON_URL)
        .then(function (res) {
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.json();
        })
        .then(function (data) {
            if (data.subtitle) {
                document.getElementById("pageSubtitle").textContent = data.subtitle;
            }
            games = data.games || [];
            if (!games.length) {
                showMessage("No games added yet. Add entries to games.json.");
                return;
            }
            track.innerHTML = "";
            games.forEach(function (game, i) {
                var card = renderCard(game, i);
                cards.push(card);
                track.appendChild(card);
            });
            setupControls();
            update();
        })
        .catch(function (err) {
            console.error("Could not load games:", err);
            showMessage("Games could not be loaded. Check that games.json exists and open this page through a web server, not file://.");
        });
})();
