(function () {
    "use strict";

    var JSON_URL = "games.json";
    var ALL = "All";

    var grid = document.getElementById("gameGrid");
    var filterBar = document.getElementById("filterBar");
    var statsBox = document.getElementById("gameStats");
    var searchInput = document.getElementById("gameSearch");
    var modalEl = document.getElementById("gameModal");

    var games = [];
    var statuses = [];
    var activeStatus = ALL;
    var query = "";

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    function statusClass(status) {
        return "game-status--" + String(status || "").toLowerCase();
    }

    function fillImage(box, game, emptyClass) {
        function placeholder() {
            box.innerHTML = "";
            var ph = el("div", emptyClass);
            ph.appendChild(el("i", "fa-solid fa-gamepad"));
            box.appendChild(ph);
        }
        if (!game.image) { placeholder(); return; }
        var img = el("img");
        img.src = game.image;
        img.alt = game.title + " cover";
        img.loading = "lazy";
        img.addEventListener("error", placeholder);
        box.appendChild(img);
    }

    function renderTile(game) {
        var col = el("div", "col");
        var tile = el("button", "game-tile");
        tile.type = "button";
        tile.setAttribute("aria-label", "View details for " + game.title);

        fillImage(tile, game, "game-tile__empty");

        tile.appendChild(el("span", "game-status neon-font " + statusClass(game.status), game.status));

        var info = el("span", "game-tile__info");
        info.appendChild(el("span", "game-tile__title grotesque-font", game.title));
        info.appendChild(el("span", "game-tile__sub neon-font", game.genre));
        tile.appendChild(info);

        tile.addEventListener("click", function () { openModal(game); });
        col.appendChild(tile);
        return col;
    }

    function matches(game) {
        if (activeStatus !== ALL && game.status !== activeStatus) return false;
        if (!query) return true;
        var haystack = [game.title, game.developer, game.genre].join(" ").toLowerCase();
        return haystack.indexOf(query) !== -1;
    }

    function renderGrid() {
        grid.innerHTML = "";
        var shown = games.filter(matches);
        if (!shown.length) {
            var msg = el("p", "game-message neon-font", "No games match your search.");
            msg.setAttribute("role", "status");
            grid.appendChild(msg);
            return;
        }
        shown.forEach(function (g) { grid.appendChild(renderTile(g)); });
    }

    function renderFilters() {
        filterBar.innerHTML = "";
        [ALL].concat(statuses).forEach(function (status) {
            var btn = el("button", "filter-btn neon-font", status);
            btn.type = "button";
            btn.dataset.status = status;
            btn.setAttribute("aria-pressed", String(status === activeStatus));
            if (status === activeStatus) btn.classList.add("is-active");
            btn.addEventListener("click", function () {
                activeStatus = status;
                Array.prototype.forEach.call(filterBar.children, function (b) {
                    var on = b.dataset.status === activeStatus;
                    b.classList.toggle("is-active", on);
                    b.setAttribute("aria-pressed", String(on));
                });
                renderGrid();
            });
            filterBar.appendChild(btn);
        });
    }

    function renderStats() {
        statsBox.innerHTML = "";
        var items = [{ label: "Total", count: games.length }];
        statuses.forEach(function (s) {
            items.push({
                label: s,
                count: games.filter(function (g) { return g.status === s; }).length
            });
        });
        items.forEach(function (item) {
            var box = el("div", "stat-box");
            box.appendChild(el("span", "stat-box__num grotesque-font", String(item.count)));
            box.appendChild(el("span", "stat-box__label neon-font", item.label));
            statsBox.appendChild(box);
        });
    }

    function openModal(game) {
        var cover = document.getElementById("gameModalCover");
        cover.innerHTML = "";
        fillImage(cover, game, "d-flex align-items-center justify-content-center game-tile__empty");

        document.getElementById("gameModalTitle").textContent = game.title;
        document.getElementById("gameModalDeveloper").textContent = game.developer;
        document.getElementById("gameModalGenre").textContent = game.genre;
        document.getElementById("gameModalReleased").textContent = game.released;

        var status = document.getElementById("gameModalStatus");
        status.textContent = game.status;
        status.className = "game-status neon-font align-self-start mb-3 " + statusClass(game.status);

        var platforms = document.getElementById("gameModalPlatforms");
        platforms.innerHTML = "";
        (game.platforms || []).forEach(function (p) {
            platforms.appendChild(el("span", "badge rounded-pill text-bg-dark neon-font", p));
        });

        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }

    function showMessage(text) {
        grid.innerHTML = "";
        var msg = el("p", "game-message neon-font", text);
        msg.setAttribute("role", "status");
        grid.appendChild(msg);
    }

    searchInput.addEventListener("input", function () {
        query = searchInput.value.trim().toLowerCase();
        renderGrid();
    });

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
            games.forEach(function (g) {
                if (statuses.indexOf(g.status) === -1) statuses.push(g.status);
            });
            renderStats();
            renderFilters();
            renderGrid();
        })
        .catch(function (err) {
            console.error("Could not load games:", err);
            showMessage("Games could not be loaded. Check that games.json exists and open this page through a web server, not file://.");
        });
})();
