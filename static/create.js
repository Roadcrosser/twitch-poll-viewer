$(() => {
    let latest_poll_id = null;

    $("#startbutton").click(() => { startpoll() });
    $("#endbutton").click(() => { endpoll() });

    $("input").on(
        "input",
        (e) => {
            let input = $(e.currentTarget);
            let maxchars = input.attr("maxlength");
            let currchars = input.val().length;

            input.next().text(`${currchars}/${maxchars}`)
        }
    );

    let headers = {
        "Authorization": `Bearer ${token}`,
        "Client-Id": client_id,
        "Content-Type": "application/json",
    }
    function startpoll() {
        let title = $(".title").val();
        let choices = []

        for (i of $(".choice")) {
            let option = $(i).val();
            if (option) {
                choices.push({ "title": option });
            }
        }

        let duration = Number($("#timer-select").val());

        if (title.length == 0 || choices.length < 2) {
            return;
        }

        let data = {
            "broadcaster_id": user_id,
            "title": title,
            "choices": choices,
            "duration": duration,
        }

        fetch("https://api.twitch.tv/helix/polls",
            {
                method: "POST",
                headers: headers,
                body: JSON.stringify(data)
            }
        ).then((data) => {
            console.log(data);
            latest_poll_id = data.id;
        });
    }

    function endpoll() {
        if (!latest_poll_id) {
            return;
        }

        data = {
            "broadcaster_id": user_id,
            "id": latest_poll_id,
            "status": "TERMINATED",
        }

        fetch("https://api.twitch.tv/helix/polls",
            {
                method: "PATCH",
                headers: headers,
                body: JSON.stringify(data)
            }
        ).then((data) => {
            console.log(data);
            latest_poll_id = data.id;
        });
    }

    let ws_protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    let uri = `${window.location.hostname}:${window.location.port}`;

    let ws_uri = `${ws_protocol}//${uri}`;

    let ws = new WebSocket(`${ws_uri}`);

    ws.onmessage = function (event) {
        let data = JSON.parse(event.data);
        latest_poll_id = data.id;
        console.log(data);
    }
});