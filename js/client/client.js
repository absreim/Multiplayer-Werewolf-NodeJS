// var Client = {

// };
// Client.socket = io.connect();

// Check if client support Web Storage. Need it to store data
if (typeof(Storage) === "undefined") {
    console.log("Error: No Web Storage support!");
}
// Create web socket connection
let socket = io();

// Check existing session storage for data. 
let clientId = sessionStorage.getItem("client-id");
let gameSessionId = sessionStorage.getItem("game-session-id");

// Map of playerId to an obj containing info related to player: 
// profile-pic, player number, etc
let playerIdMap = {};

// Populate text box(es) with random data
$("#client-name").val(faker.name.findName());

socket.on('numbers-update', function(randNum) {
    $('#displaynum').text(randNum);
});

socket.on("server-update", function(serverMsg) {
    processServerUpdate(serverMsg);
});

function processServerUpdate(serverMsg) {

    // Log the msg to the server message box so we can see it 
    updateServerMsgBox(serverMsg);

    let type = serverMsg.type;
    // console.log("Received server-update. " + pp(serverMsg));              
    if (type === "client-id") {
        processUpdateClientId(serverMsg);
    } else if (type === "game-session-id") {
        processUpdateGameId(serverMsg);
    } else if (type === "game-started") {
        // processGameStarted(serverMsg);
        // TODO. Countdown to start. Switch daylight bg to night
    } else if (type === "give-role") {
        processUpdateRole(serverMsg);
    } else if (type === "announcer-msg") {
        processAnnouncerMsg(serverMsg);
    } else if (type === "do-role-action") {
        processDoRoleAction(serverMsg);
    } else if (type === "error-msg") {
        processErrorMsg(serverMsg);
    }
    else if (type === "stats") {
        processGameStats(serverMsg);
    } 
    else {
        console.log("Unknown server update type: " + type);
    }
}

function processUpdateClientId(serverMsg) {
    clientId = serverMsg.data;
    // Store it in session storage
    sessionStorage.setItem("client-id", clientId);
    // Display it
    $(".client-id").text(clientId);

    // Randomly select a profile-pic for this player
    let picUrl = trySetRandomAvatar(clientId);
    $(".player-pic").css("content", "url(" + picUrl + ")");
}



function processUpdateGameId(serverMsg) {
    let gameSessionId = serverMsg.data;
    console.log("received game session id from server: " + gameSessionId);
    sessionStorage.setItem("game-session-id", gameSessionId);
    $(".game-session-id").text(gameSessionId);
}

function processUpdateRole(serverMsg) {
    let roleCard = serverMsg.data;
    sessionStorage.setItem("role-card", roleCard);
    $(".role-card").text(roleCard);
    // Update role card bg
    console.log("roleCard: " + roleCard);
    let imgUrl = RoleMap[roleCard].getImgUrl();
    imgUrl = "url(" + imgUrl + ")";
    $("img.role-card-img").css("content", imgUrl);

    // Also change daylight bg to night bg. This should be changed later.
    $("#game-header .bg").css("content", "url(assets/night-1.png)");
}

function processAnnouncerMsg(serverMsg) {
    let newMsg = serverMsg.data;
    // let currentMsgs = $(".announcer-msgs").text;
    $(".announcer-msgs").prepend(newMsg);
}

function processDoRoleAction(serverMsg) {
    let roleStr = serverMsg.role;
    let role = RoleMap[roleStr];
    //let playerInstructions = serverMsg.playerInstructions;
    let data = serverMsg.data;
    
    $(".role-instructions").text(role.instructions);
    $(".role-data").text(data);

    if (role === "werewolf") {

    } else if (role === "") {

    }
}

function processErrorMsg(serverMsg) {
    let msg = serverMsg.data;
    // TODO       
}

function processGameStats(serverMsg) {
    let stats = serverMsg.data;
    let playerName = stats["playerName"];
    let clientId = stats["clientId"];
    let gameId = stats["gameId"];
    let numPlayers = stats["numPlayers"];
    let gameState = stats["gameState"];
    let roleCard = stats["roleCard"];
    let allCards = stats["allCards"];
    let playersInGame = stats["playersInGame"];

    if (!!clientId) { $(".client-id").text(clientId); }
    if (!!gameId) { $(".game-session-id").text(gameId); }
    if (!!numPlayers) { $(".num-players-in-game").text(numPlayers); }
    if (!!gameState) { $(".game-state").text(gameState); }
    if (!!roleCard) { $(".role-card").text(roleCard); }
    if (!!allCards) { $(".all-cards").text(allCards.join("|")); }
    if (!!playersInGame) {
        // Check if player is new or already registered with the client
        for (let somePlayerObj of playersInGame) {
            let somePlayerId = somePlayerObj["playerId"];
            let localPlayerObj = playerIdMap[somePlayerId];
            if (!localPlayerObj) {
                // Register the player with the client                
                playerIdMap[somePlayerId] = {
                    playerId: somePlayerId,
                    playerName: somePlayerObj["playerName"]
                };
                let picUrl = trySetRandomAvatar(somePlayerId);
            }
        }
    }
}

function updateServerMsgBox(anyVal) {
    if (!!anyVal) {
        $(".server-msgs").prepend(Util.getTimestamp() + " Received: " + Util.pp(anyVal) + "\n");
    }
}

$("#clear-local-data").click( function() {
    sessionStorage.clear();
});

$("#connect-to-server").click( function() {
    console.log("connect to server button clicked.");
    let clientMsg = createClientMsg("client-id");
    clientMsg["playerName"] = $("#client-name").val();
    socket.emit("ask-server", clientMsg);
});

$("#join-game").click( function() {
    let clientMsg = createClientMsg("game-id");
    socket.emit("ask-server", clientMsg);
});

$("#start-game").click( function() {
    let clientMsg = createClientMsg("start-game");
    socket.emit("ask-server", clientMsg);

    // clientMsg = createClientMsg("stats|numPlayersInGame");
    // socket.emit("ask-server", clientMsg, function(data) {
    //   $(".num-players-in-game").text(data);
    // });
});

$("#do-game-action").click( function() {
    let clientMsg = createClientMsg("did-role-action");
    socket.emit("ask-server", clientMsg);
});

// Create the client msg to send to server
function createClientMsg(request) {
    return {
        clientId: sessionStorage.getItem("client-id"),
        gameSessionId: sessionStorage.getItem("game-session-id"),
        request: request
    };
}

function getRandomAvatarUrl() {
    let randPicNum = Util.randInt(17) + 1;
    let picUrl = "assets/avatars/profile-" + randPicNum + ".png";
    return picUrl;
}

// Generates a new avatar url for the playerId if there isn't an existing one
function trySetRandomAvatar(playerId) {
    let playerObj = playerIdMap[playerId];
    if (!playerObj) {
        playerObj = {};
    }
    if (!playerObj.profileUrl) {
        let picUrl = getRandomAvatarUrl();
        playerObj.profileUrl = picUrl;
    }
    playerIdMap[playerId] = playerObj;
    return playerObj.profileUrl;
}
