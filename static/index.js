let list, timer, votelist;

let timerStart = null;
let timerEnd = null;


class VoteList {
    constructor(votelist) {
        this.list = votelist;
        this.allvotes = {};
        this.is_running = false;
    }

    setVotes(voteslist) {
        // votelist: list of [id, name, votecount]

        let votesSet = new Set();
        let totalvotecount = 0

        for (let i of voteslist) {
            votesSet.add(i[0]);
            totalvotecount += i[2];
        }

        // Iterate over all votes and remove old votes
        for (let i of Object.keys(this.allvotes)) {
            if (!votesSet.has(i)) {
                this.allvotes[i].remove();
                delete this.allvotes[i];
            }
        }

        if (!this.is_running) {
            voteslist.sort((a, b) => {
                return b[2] - a[2];
            })
        }

        let votelistitemheight = 40; // TODO: get this dynamically

        let top_count = null;

        for (let i = 0; i < voteslist.length; i++) {
            let voteid = voteslist[i][0];
            let votename = voteslist[i][1];
            let votecount = voteslist[i][2];
            let voteratio = votecount / totalvotecount;

            let voteitem = this.allvotes[voteid];
            if (voteitem === undefined) {
                voteitem = this.generateVoteDisplay(votename);

                this.allvotes[voteid] = voteitem;
            }

            voteitem.find(".votebar-bg .votebar-fg").css("width", `${voteratio * 100}%`);
            voteitem.css("margin-top", `${votelistitemheight * i}px`);

            voteitem.find(".votepercentage-ani").css("--num", votecount > 0 ? Math.round(voteratio * 100) : 0);
            voteitem.find(".votecount-ani").css("--num", votecount);

            if (i == 0 && !this.is_running) {
                top_count == votecount;
            }
            if (votecount == top_count) {
                voteitem.addClass("top-vote");
            } else {
                voteitem.removeClass("top-vote");
            }
        }

        this.list.css("height", `${votelistitemheight * voteslist.length}px`);

    }

    generateVoteDisplay(votename) {
        let new_vote = $("<li></li>")
        new_vote.addClass("votelist-item");

        let votebar_bg = $("<div></div>").addClass("votebar-bg");
        let votebar_fg = $("<div></div>").addClass("votebar-fg");
        let vote_text = $("<div></div>").addClass("vote-text");

        let vote_info = $("<div></div>").addClass("vote-info").append(
            $("<span></span>").addClass("votepercentage-ani")
        ).append("% ("
        ).append($("<span></span>").addClass("votecount-ani")
        ).append(")");
        vote_text.append($("<div></div>").text(votename)).append(vote_info);

        votebar_fg.css("width", "0%");
        new_vote.css("margin-top", "-100%");

        votebar_bg.append(vote_text).append(votebar_fg);
        new_vote.append(votebar_bg);
        this.list.append(new_vote);

        return new_vote; // Manage indexes elsewhere
    }

    setRunning(is_running) {
        this.is_running = is_running;
    }
}

function process_payload(payload) {
    $("#votetitle").text(payload.title);
    votelist.setRunning(payload.is_running);
    votelist.setVotes(payload.choices);

    let time_end = payload.started;

    if (payload.is_running) {
        time_end += payload.duration;
        // We only set the timer while running because of this one weird bug that makes the timer reset or jump up or smth
        // Should fix that at some point.
        setTimer(payload.started, time_end);
    }
}

$(() => {
    list = $("#votelist");
    timer = $("#votetimer");

    votelist = new VoteList(list);

    votelist.setVotes([
        ["aaa", "Option 1", 100],
        ["bbb", "Option 2", 50],
        ["ccc", "Option 3", 20],
        ["ddd", "Option 4", 2]]
    );

    let ws_protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    let uri = `${window.location.hostname}:${window.location.port}`;

    let ws_uri = `${ws_protocol}//${uri}`;

    let ws = new WebSocket(`${ws_uri}`);

    ws.onmessage = function (event) {
        let data = JSON.parse(event.data);
        process_payload(data);

    }

    window.requestAnimationFrame(animateTimer);

});

function animateTimer() {
    if (timerStart !== null && timerEnd !== null) {
        $(".votebox").removeClass("hidden");
        let currtime = Date.now();
        let timeelapsed = currtime - timerStart;
        let totaltime = timerEnd - timerStart;
        timeelapsed = Math.min(timeelapsed, totaltime);
        let percentage = (1 - (timeelapsed / totaltime)) * 100;
        $("#timerbar-fg").css("width", `${percentage}%`);
        $("#timernumber").text(Math.ceil((totaltime - timeelapsed) / 1000));

        // wait for n seconds before hiding
        if (inactive_count !== null && (currtime - timerEnd) > (inactive_count * 1000)) {
            $(".votebox").addClass("hidden");
        }

    }

    window.requestAnimationFrame(animateTimer);
}

function setTimer(newTimeStart, newTimeEnd) {
    timerStart = newTimeStart;
    timerEnd = newTimeEnd;
}

function setTimerTest(seconds) {
    let currtime = Date.now();
    setTimer(currtime, currtime + seconds * 1000);
}
