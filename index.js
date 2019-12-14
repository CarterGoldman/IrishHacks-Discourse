// Import stylesheets
import "./style.css";

//constants
const loginButton = document.getElementById("login");
const questionnaireButton = document.getElementById("questionnaire-button");
const chatButton = document.getElementById("start-chat");
const welcomeText = document.getElementById("welcome");
const questionnaire = document.getElementById("questionnaire");
const submitButton = document.getElementById("submit");
const cancelButton = document.getElementById("cancel-questionnaire");
const chatContainer = document.getElementById("chat-container");
const matchesDisplay = document.getElementById("matches-display");
const matchesHeader = document.getElementById("matches-header");
const chatHeader = document.getElementById("chat-with");
const suggestionButton = document.getElementById("suggestion");

//some initial things
questionnaire.style.display = "none";
chatContainer.style.display = "none";
matchesDisplay.style.display = "none";
matchesHeader.style.display = "none";
var chatting = false;
var storeScores = null;
var currentChatPairScores = null;

// Firebase App (the core Firebase SDK) is always required and must be listed first
import * as firebase from "firebase/app";

// Add the Firebase products that you want to use
import "firebase/auth";
import "firebase/firestore";

import * as firebaseui from "firebaseui";

// Your web app's Firebase configuration
var firebaseConfig = {
  apiKey: "AIzaSyAC_NdCcqA-vTNLJ5XORYfdq2Gt2595RGM",
  authDomain: "political-chat-9ab10.firebaseapp.com",
  databaseURL: "https://political-chat-9ab10.firebaseio.com",
  projectId: "political-chat-9ab10",
  storageBucket: "political-chat-9ab10.appspot.com",
  messagingSenderId: "81824703744",
  appId: "1:81824703744:web:e24524e883557c5c997fe5"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// FirebaseUI config
const uiConfig = {
  credentialHelper: firebaseui.auth.CredentialHelper.NONE,
  signInOptions: [
    // Email / Password Provider.
    firebase.auth.EmailAuthProvider.PROVIDER_ID
  ],
  callbacks: {
    signInSuccessWithAuthResult: function(authResult, redirectUrl) {
      // Handle sign-in.
      // Return false to avoid redirect.
      return false;
    }
  }
};

const ui = new firebaseui.auth.AuthUI(firebase.auth());

// Listen to login button clicks
loginButton.addEventListener("click", () => {
  if (firebase.auth().currentUser) {
    // User is signed in; allows user to sign out
    firebase.auth().signOut();
  } else {
    // No user is signed in; allows user to sign in
    ui.start("#firebaseui-auth-container", uiConfig);
  }
});

// Listen to the current Auth state
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    loginButton.textContent = "Logout";
    chatButton.style.display = "inline-block";
    questionnaireButton.style.display = "inline-block";
    welcomeText.innerHTML =
      "Welcome, " + firebase.auth().currentUser.displayName + "!";
    //if the user has taken the questionnaire
    firebase
      .firestore()
      .collection("questionnaire")
      .doc(firebase.auth().currentUser.uid)
      .get()
      .then(function(doc) {
        if (doc.exists) {
          questionnaireButton.innerHTML = "Re-Take the Questionnaire";
          chatButton.style.display = "inline-block";
          chatButton.innerHTML = "Start Chatting";
          chatting = false;
        } else {
          chatButton.style.display = "none";
          questionnaireButton.innerHTML = "Take the Questionnaire";
        }
      });

    firebase
      .firestore()
      .collection("questionnaire")
      .orderBy("timestamp", "desc")
      .onSnapshot(snaps => {
        getAndDisplayMatches();
      });
  } else {
    loginButton.textContent = "Get Started";
    questionnaireButton.style.display = "none";
    chatButton.style.display = "none";
    welcomeText.innerHTML = "Welcome!";
    questionnaire.style.display = "none";
    chatContainer.style.display = "none";
    matchesDisplay.style.display = "none";
    matchesHeader.style.display = "none";
    chatButton.innerHTML = "Start Chatting";
    chatting = false;
    storeScores = null;
    currentChatPairScores = null;
  }
});

//listens to questionnaire button clicks
questionnaireButton.addEventListener("click", () => {
  questionnaire.style.display = "inline-block";
  firebase
    .firestore()
    .collection("questionnaire")
    .doc(firebase.auth().currentUser.uid)
    .get()
    .then(function(doc) {
      if (doc.exists) {
        chatButton.style.display = "none";
      }
    });
});

//closes the questionnaire
cancelButton.addEventListener("click", () => {
  questionnaire.style.display = "none";

  chatButton.style.display = "inline-block";
});

//handles checking and submitting the questionnaire
submitButton.addEventListener("click", e => {
  var n, // loop index
    i, //loop index
    question,
    q1Score,
    q2Score,
    q3Score,
    q4Score,
    q5Score,
    answerCount = 0;

  for (i = 1; i <= 5; i++) {
    question = document.getElementsByName("element_" + i);
    for (n = 0; n < question.length; n++) {
      // iterates through items in HTMLCollection
      if (question[n].checked) {
        // checks the current item's 'checked' property
        eval("q" + i + "Score = (parseInt(question[n].value,10))"); // found the checked-one
        answerCount++;
        break; // "checked" found, no need to search more
      }
    }
  }
  var totalScore = q1Score + q2Score + q3Score + q4Score + q5Score;
  if (answerCount == 5) {
    // Prevent the default form redirect
    e.preventDefault();
    // Write the questionnaire answers to the database
    firebase
      .firestore()
      .collection("questionnaire")
      .doc(firebase.auth().currentUser.uid)
      .set({
        name: firebase.auth().currentUser.displayName,
        userId: firebase.auth().currentUser.uid,
        timestamp: Date.now(),
        score1: q1Score,
        score2: q2Score,
        score3: q3Score,
        score4: q4Score,
        score5: q5Score,
        total: totalScore
      });
    questionnaire.style.display = "none";
    questionnaireButton.innerHTML = "Re-Take the Questionnaire";
    chatButton.style.display = "inline-block";
    // Return false to avoid redirect
    return false;
  } else {
    alert("Please answer all of the questions.");
  }
});

chatButton.addEventListener("click", () => {
  chatting = !chatting;
  if (chatting) {
    matchesDisplay.style.display = "inline";
    matchesHeader.style.display = "inline";
    chatButton.innerHTML = "Stop Chatting";
    questionnaireButton.style.display = "none";
  } else {
    matchesDisplay.style.display = "none";
    matchesHeader.style.display = "none";
    chatButton.innerHTML = "Start Chatting";
    questionnaireButton.style.display = "inline";
    chatContainer.style.display = "none";
  }
});

////  BACKEND /////
var currentChat = null;

function sq(x) {
  return x * x;
}

function displayProfile(userId, domElem) {
  var profile = {};

  console.log("Retreiving profile for " + userId);
  firebase
    .firestore()
    .collection("questionnaire")
    .doc(userId)
    .get()
    .then(function(doc) {
      if (doc.exists) {
        profile.name = doc.data().name;
      } else {
        profile.name = "none";
      }

      //domElem.innerHTML = profile.name;
      domElem.innerHTML +=
        "<button class = 'chat_button' id='chat_with_" +
        doc.data().userId +
        "'>" +
        profile.name +
        "</button>";
      var button = document.getElementById("chat_with_" + doc.data().userId);
      button.targetUserId = doc.data().userId;
      document
        .getElementById("chat_with_" + doc.data().userId)
        .addEventListener("click", event => {
          createChat(event.currentTarget.targetUserId);
          chatContainer.style.display = "block";
          chatHeader.innerHTML = "Chat with " + doc.data().name;
        });
    });
}

function displayMatches(userId, scores, matchesContainer) {
  firebase
    .firestore()
    .collection("questionnaire")
    .get()
    .then(function(querySnapshot) {
      var matches = [];

      querySnapshot.forEach(function(doc) {
        if (doc.data().userId != userId) {
          var elem;
          var diff =
            sq(Number(doc.data().score1) - scores[0]) +
            sq(Number(doc.data().score2) - scores[1]) +
            sq(Number(doc.data().score3) - scores[2]) +
            sq(Number(doc.data().score4) - scores[3]) +
            sq(Number(doc.data().score5) - scores[4]);
          var l = matches.length;
          var i;
          var match = { userId: doc.data().userId, diff: diff };
          for (i = 0; i < l; i++) {
            if (diff > matches[i].diff) {
              matches.splice(i, 0, match);
              break;
            }
          }
          if (i == l && l < 5) {
            matches.push(match);
          }

          if (matches.length > 5) {
            matches.pop();
          }
        }
      });

      matchesContainer.innerHTML = "";
      matches.forEach(function(item) {
        var domElem = document.createElement("li");
        matchesContainer.appendChild(domElem);
        displayProfile(item.userId, domElem);
      });
    });
}

function getAndDisplayMatches() {
  firebase
    .firestore()
    .collection("questionnaire")
    .doc(firebase.auth().currentUser.uid)
    .get()
    .then(function(doc) {
      if (doc.exists) {
        var matches = [
          doc.data().score1,
          doc.data().score2,
          doc.data().score3,
          doc.data().score4,
          doc.data().score5
        ];

        var matchesContainer = document.getElementById("matches-display");
        displayMatches(
          firebase.auth().currentUser.uid,
          matches,
          matchesContainer
        );
      }
    });
}

function showChatData() {
  firebase
    .firestore()
    .collection("chats")
    .doc(currentChat)
    .collection("messages")
    .get()
    .then(function(querySnapshot) {
      var matches = [];
      var form_display = document.getElementById("chat-display");
      form_display.innerHTML = "";
      console.log("Beginning");
      querySnapshot.forEach(function(doc) {
        console.log(doc.data());
        const entry = document.createElement("p");
        entry.classList.add("message");
        if (doc.data().name.toUpperCase() === "SUGGESTION") {
          entry.classList.add("suggestion");
        } else if (
          doc.data().name.toUpperCase() !==
          firebase.auth().currentUser.displayName.toUpperCase()
        ) {
          entry.classList.add("other");
        }
        entry.textContent = doc.data().name + ": " + doc.data().text;
        form_display.appendChild(entry);
      });
      console.log("finished");
    });
}

function displayChat(name) {
  currentChatPairScores = null;
  console.log("openingChat: " + "chats/" + name + "/messages");
  currentChat = name;
  console.log("using chat: " + name);
  var dbchat = firebase
    .firestore()
    .collection("chats")
    .doc(currentChat)
    .collection("messages");
  console.log(dbchat);
  dbchat.orderBy("timestamp", "desc").onSnapshot(snaps => {
    console.log("Got chat update!");
    // Reset page
    var form_display = document.getElementById("chat-display");
    form_display.innerHTML = "";
    // Loop through documents in database
    snaps.forEach(doc => {
      // Create an HTML entry for each document and add it to the chat
      console.log(doc.data());
      const entry = document.createElement("p");
      entry.classList.add("message");
      if (doc.data().name.toUpperCase() === "SUGGESTION") {
        entry.classList.add("suggestion");
      } else if (
        doc.data().name.toUpperCase() !==
        firebase.auth().currentUser.displayName.toUpperCase()
      ) {
        entry.classList.add("other");
      }
      entry.textContent = doc.data().name + ": " + doc.data().text;
      form_display.appendChild(entry);
    });
    //showChatData();
  });
}

var createChat = function(withUserId) {
  var userId = firebase.auth().currentUser.uid;
  var possibleChats = firebase
    .firestore()
    .collection("chats")
    .where("people", "array-contains", userId);

  possibleChats.get().then(function(querySnapshot) {
    var found = false;
    querySnapshot.forEach(function(doc) {
      console.log(doc.data().people);
      if (doc.data().people.indexOf(withUserId) != -1) {
        if (!found) {
          var docId = doc.id;
          displayChat(docId);
          found = true;
          console.log("foundChat!");
        }
      }
    });

    if (!found) {
      firebase
        .firestore()
        .collection("chats")
        .add({
          people: [userId, withUserId]
        })
        .then(function(docRef) {
          displayChat(docRef.id);
        });
    }
  });
};

var chatForm = document.getElementById("chat-form");
chatForm.addEventListener("submit", e => {
  console.log("submitting text");
  // Prevent the default form redirect
  e.preventDefault();
  // Write a new message to the database collection
  console.log(currentChat);
  //check if the chat exists and check for whitespace
  if (
    currentChat &&
    document.getElementById("chat-input").value.replace(/\s/g, "").length
  ) {
    var message = document.getElementById("chat-input").value;
    var form_display = document.getElementById("chat-display");
    const entry = document.createElement("p");
    entry.classList.add("message");
    entry.textContent =
      firebase.auth().currentUser.displayName + ": " + message;
    deletableDOMElem = entry;
    form_display.insertBefore(entry, form_display.childNodes[0] || null);
    sendWatsonMessage(document.getElementById("chat-input").value);
  }
  document.getElementById("chat-input").value = "";
});

suggestionButton.addEventListener("click", () => {
  showChatRecommendations();
});

var selfScores;
function showChatRecommendations() {
  if (currentChatPairScores) {
    firebase
      .firestore()
      .collection("questionnaire")
      .doc(firebase.auth().currentUser.uid)
      .get()
      .then(function(doc) {
        if (doc.exists) {
          selfScores = [
            doc.data().score1,
            doc.data().score2,
            doc.data().score3,
            doc.data().score4,
            doc.data().score5
          ];
        }
      });
    var i;
    var agree = null;
    for (i = 0; i < 5; i++) {
      if (selfScores[i] == currentChatPairScores[i]) {
        switch (i) {
          case 0:
            agree = "abortion";
            break;
          case 1:
            agree = "the border wall";
            break;
          case 2:
            agree = "guns";
            break;
          case 3:
            agree = "medicare";
            break;
          case 4:
            agree = "global warming";
            break;
        }
        firebase
          .firestore()
          .collection("chats")
          .doc(currentChat)
          .collection("messages")
          .add({
            person: "Suggestion",
            name: "Suggestion",
            text:
              "You both agree on " +
              agree +
              ".  Maybe you should start the conversation there.",
            timestamp: Date.now()
          });
        break;
      }
    }
    if (!agree) {
      for (i = 0; i < 5; i++) {
        if (
          Math.abs(
            parseInt(selfScores[i], 10) - currentChatPairScores[i],
            10
          ) == 50
        ) {
          switch (i) {
            case 0:
              agree = "abortion";
              break;
            case 1:
              agree = "the border wall";
              break;
            case 2:
              agree = "guns";
              break;
            case 3:
              agree = "medicare";
              break;
            case 4:
              agree = "global warming";
              break;
          }
          if (currentChat) {
            firebase
              .firestore()
              .collection("chats")
              .doc(currentChat)
              .collection("messages")
              .add({
                person: "Suggestion",
                name: "Suggestion",
                text:
                  "You both have similar stances on " +
                  agree +
                  ".  Maybe you should start the conversation there.",
                timestamp: Date.now()
              });
          }

          break;
        }
      }
    }
    if (!agree) {
      if (currentChat) {
        firebase
          .firestore()
          .collection("chats")
          .doc(currentChat)
          .collection("messages")
          .add({
            person: "Suggestion",
            name: "Suggestion",
            text:
              "Neither of you agree on much of anything.  Try to understand where the other person is coming from.",
            timestamp: Date.now()
          });
      }
    }
  } else {
    if (currentChat) {
      firebase
        .firestore()
        .collection("chats")
        .doc(currentChat)
        .get()
        .then(function(doc) {
          var partnerName = doc.data().people[0];
          if (partnerName == firebase.auth().currentUser.uid) {
            partnerName = doc.data().people[1];
          }
          firebase
            .firestore()
            .collection("questionnaire")
            .doc(partnerName)
            .get()
            .then(function(doc2) {
              currentChatPairScores = [
                doc2.data().score1,
                doc2.data().score2,
                doc2.data().score3,
                doc2.data().score4,
                doc2.data().score5
              ];
              showChatRecommendations();
            });
        });
    }
  }
}

var outgoingMessage = "";
var deletableDOMElem = null;

var wsUri = "wss://discorse.us-south.cf.appdomain.cloud/ws/chat";
var ws = new WebSocket(wsUri);
ws.onopen = function(ev) {
  console.log("Connected");
};
ws.onclose = function(ev) {
  console.log("Disconnected");
  ws = new WebSocket(wsUri);
};
ws.onmessage = function(ev) {
  var payload = JSON.parse(ev.data);

  var anger = payload.document_tone.tone_categories[0].tones[0].score;
  var disgust = payload.document_tone.tone_categories[0].tones[1].score;
  console.log(anger, disgust);
  if ((parseFloat(anger) >= 0.5) || (parseFloat(disgust) >= 0.5)) {
    // Get the modal
    var modal = document.getElementById("myModal");
    // Get the <span> element that closes the modal
    var span = document.getElementsByClassName("close")[0];
    modal.style.display = "block";
    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
      modal.style.display = "none";
    };
    document.getElementById("yes").addEventListener("click", () => {
      firebase
        .firestore()
        .collection("chats")
        .doc(currentChat)
        .collection("messages")
        .add({
          person: firebase.auth().currentUser.uid,
          name: firebase.auth().currentUser.displayName,
          text: outgoingMessage,
          timestamp: Date.now()
        });
      modal.style.display = "none";
    });
    document.getElementById("no").addEventListener("click", () => {
      modal.style.display = "none";
      //showChatData();
      deletableDOMElem.remove();
    });
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    };
  } else {
    firebase
      .firestore()
      .collection("chats")
      .doc(currentChat)
      .collection("messages")
      .add({
        person: firebase.auth().currentUser.uid,
        name: firebase.auth().currentUser.displayName,
        text: outgoingMessage,
        timestamp: Date.now()
      });
  }
};
function sendWatsonMessage(message) {
  outgoingMessage = message;

  var payload = {
    text: message
  };
  ws.send(JSON.stringify(payload));
}
