(function () {
    "use strict";

    var JSON_URL = "skills.json";
    var ALL = "All";

    var container = document.getElementById("skillsContainer");
    var filterBar = document.getElementById("filterBar");

    var skills = [];
    var categories = [];
    var active = ALL;

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    function renderSkill(skill) {
        var card = el("div", "skill-item");

        var img = el("img", "skill-item__img");
        img.src = skill.image;
        img.alt = skill.name;
        img.width = 80;
        img.height = 80;
        img.loading = "lazy";
        img.addEventListener("error", function () {
            img.remove();
            card.classList.add("skill-item--noimg");
        });

        card.appendChild(img);
        card.appendChild(el("span", "skill-item__name neon-font", skill.name));
        return card;
    }

    function renderGroup(category) {
        var group = el("div", "col-12 mb-5");
        group.appendChild(el("h3", "h4 fw-bold mb-4 grotesque-font", category));

        var list = el("div", "d-flex flex-wrap gap-4");
        skills
            .filter(function (s) { return s.category === category; })
            .forEach(function (s) { list.appendChild(renderSkill(s)); });

        group.appendChild(list);
        return group;
    }

    function renderSkills() {
        container.innerHTML = "";
        var shown = active === ALL ? categories : [active];
        shown.forEach(function (c) {
            container.appendChild(renderGroup(c));
        });
    }

    function updateButtons() {
        Array.prototype.forEach.call(filterBar.children, function (btn) {
            var isActive = btn.dataset.category === active;
            btn.classList.toggle("is-active", isActive);
            btn.setAttribute("aria-pressed", String(isActive));
        });
    }

    function setCategory(category) {
        active = category;
        updateButtons();
        renderSkills();
    }

    function renderFilters() {
        filterBar.innerHTML = "";
        [ALL].concat(categories).forEach(function (category) {
            var btn = el("button", "filter-btn neon-font", category);
            btn.type = "button";
            btn.dataset.category = category;
            btn.addEventListener("click", function () { setCategory(category); });
            filterBar.appendChild(btn);
        });
        updateButtons();
    }

    function showMessage(text) {
        filterBar.innerHTML = "";
        container.innerHTML = "";
        var msg = el("p", "skills-message neon-font", text);
        msg.setAttribute("role", "status");
        container.appendChild(msg);
    }

    fetch(JSON_URL)
        .then(function (res) {
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.json();
        })
        .then(function (data) {
            skills = data.skills || [];
            if (!skills.length) {
                showMessage("No skills added yet. Add entries to skills.json.");
                return;
            }
            skills.forEach(function (s) {
                if (categories.indexOf(s.category) === -1) categories.push(s.category);
            });
            renderFilters();
            renderSkills();
        })
        .catch(function (err) {
            console.error("Could not load skills:", err);
            showMessage("Skills could not be loaded. Check that skills.json exists and open this page through a web server, not file://.");
        });
})();