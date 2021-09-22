let list, timer, votelist;

let currPollId = null;
let hasStopped = false;
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
            let votepercentage = votecount > 0 ? Math.round(voteratio * 100) : 0

            let voteitem = this.allvotes[voteid];
            if (voteitem === undefined) {
                voteitem = this.generateVoteDisplay(votename);

                this.allvotes[voteid] = voteitem;
            }

            voteitem.find(".votebar-bg .votebar-fg").css("width", `${voteratio * 100}%`);
            voteitem.css("margin-top", `${votelistitemheight * i}px`);


            let votepercentagespan = voteitem.find(".votepercentage-ani");
            let votecountspan = voteitem.find(".votecount-ani");

            if (!votepercentagespan.text()) {
                votepercentagespan.text("0")
            };
            if (!votecountspan.text()) {
                votecountspan.text("0")
            };

            let votebar_obj = {
                votecount: Number(votecountspan.text()),
                votepercentage: Number(votepercentagespan.text()),
            };

            if (i == 0 && !this.is_running) {
                top_count == votecount;
            }
            if (votecount == top_count) {
                voteitem.addClass("top-vote");
            } else {
                voteitem.removeClass("top-vote");
            }

            anime({
                targets: votebar_obj,
                votecount: votecount,
                votepercentage: votepercentage,
                round: 1,
                duration: 500,
                easing: "cubicBezier(1, 0, 0, 1)",
                update: () => {
                    this.updateVotebar(votepercentagespan, votecountspan, votebar_obj);
                },
            });

        }

        this.list.css("height", `${votelistitemheight * voteslist.length}px`);

    }

    updateVotebar(votepercentagespan, votecountspan, obj) {
        votepercentagespan.text(obj.votepercentage)
        votecountspan.text(obj.votecount)
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


    if (currPollId != votelist.id) {
        currPollId = votelist.id;
        hasStopped = false;

        let time_end = payload.started + payload.duration;
        setTimer(payload.started, time_end);
    }


    if (!payload.is_running && !hasStopped) {
        hasStopped = true;
        let time_end = Date.now()
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
    console.log(timerStart)
    console.log(timerEnd)
    console.log("0")
    if (timerStart !== null && timerEnd !== null) {
        console.log(timerStart)
        $(".votebox").removeClass("hidden");
        let currtime = Date.now();
        let timeelapsed = currtime - timerStart;
        console.log(timeelapsed)
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
