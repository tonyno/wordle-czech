/* eslint-disable object-curly-spacing */
// https://firebase.google.com/docs/functions/typescript
// good example: https://blog.logrocket.com/rest-api-firebase-cloud-functions-typescript-firestore/
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { calculateStatsScore, FirstWords, StatsDay } from "./stats";
import { dateToStr, getDateFromSolutionIndex, getWordIndex } from "./words";

admin.initializeApp();

const db = admin.firestore();

// https://firebase.google.com/docs/functions/schedule-functions
// https://cloud.google.com/appengine/docs/standard/python/config/cronref
exports.unlockNewWord = functions.pubsub
  .schedule("every day 15:00")
  .timeZone("Europe/Prague")
  .onRun(async (context) => {
    try {
      const now = new Date();
      const actualDateStr = dateToStr(now);
      functions.logger.info(
        "Current date and time: ",
        now.toString(),
        ". Going to open word for: ",
        actualDateStr +
          ". Actual hour " +
          now.getHours() +
          " utc hour " +
          now.getUTCHours()
      );

      const entry = db.collection("word").doc(actualDateStr);
      const currentData = (await entry.get()).data() || {};
      if (currentData && currentData.solution && currentData.solutionIndex) {
        currentData.locked = false;
        const retVal = await entry.set(currentData);
        functions.logger.info("Saved. Result value: ", retVal);
      } else {
        functions.logger.error(
          "Word item not found in database " + actualDateStr
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error) {
      functions.logger.error("Exception during processing: ", error);
    }
  });

const getSolutionDataFromDb = async (
  dateStr: string
): Promise<any | undefined> => {
  const entry = db.collection("word").doc(dateStr);
  const currentData = entry
    ? (await entry.get()).data() || undefined
    : undefined;
  return currentData;
};

exports.statistics = functions
  .runWith({ timeoutSeconds: 2 * 60 }) // https://firebase.google.com/docs/functions/manage-functions#set_timeout_and_memory_allocation
  .pubsub.schedule("every day 18:05")
  .timeZone("Europe/Prague")
  .onRun(async (context) => {
    const solutionIndex = getWordIndex() - 1;
    const now = new Date();

    functions.logger.info(
      "Current system date and time: " +
        now.toString() +
        " going to analyze day " +
        solutionIndex
    );

    await statisticsForDay(solutionIndex);
    await statisticsForDay(solutionIndex - 7); // also update data one week ago

    // for (let i = 0; i <= 25; ++i) {
    //   functions.logger.info("Processing day " + i);
    //   await statisticsForDay(i);
    // }
    // Function execution took 214515 ms, finished with status: 'ok'
  });

exports.statisticsTest = functions.https.onRequest(
  async (request, response) => {
    // await statisticsForDay(1001);
    // await statisticsForDay(1000);
    // for (let i = 0; i <= 3; ++i) {
    //   functions.logger.info("Processing day " + i);
    //   await statisticsForDay(i);
    // }
    response.send("Hello from Firebase!!!!!>> ");
  }
);

const statisticsForDay = async (solutionIndex: number) => {
  const now = new Date();
  const day = "day" + solutionIndex;

  const dateStr = dateToStr(getDateFromSolutionIndex(solutionIndex));
  const solutionRecord = await getSolutionDataFromDb(dateStr);
  const solutionWord = solutionRecord ? solutionRecord?.solution : undefined;

  functions.logger.info(
    "Current system date and time: " +
      now.toString() +
      " going to analyze day " +
      day +
      " what is date " +
      dateStr
  );

  const guessesDistribution = [0, 0, 0, 0, 0, 0, 0];
  let winCount = 0;
  let looseCount = 0;
  const firstWords: FirstWords = {};

  const querySnapshot = await db
    .collection("gameResult")
    .doc(day)
    .collection("result")
    .get();

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.result === "win") {
      guessesDistribution[data.numberOfGuesses] += 1;
      winCount += 1;
    } else if (data.result === "loose") {
      guessesDistribution[6] += 1;
      looseCount += 1;
    }
    if (data.guesses && data.guesses.length > 0) {
      const firstWord = data.guesses[0];
      if (firstWord in firstWords) {
        firstWords[firstWord] += 1;
      } else {
        firstWords[firstWord] = 1;
      }
    }
    //functions.logger.info(data);
  });

  //const str = firstWords.toString();
  const firstWordsSliced = Object.entries(firstWords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((item) => {
      return { word: item[0], count: item[1] };
    });

  const statsResult: StatsDay = {
    dateStr: dateStr,
    games: looseCount + winCount,
    loose: looseCount,
    win: winCount,
    guessesDistribution: guessesDistribution,
    firstGuesses: firstWordsSliced,
    score: calculateStatsScore(guessesDistribution),
    solutionIndex: solutionIndex,
    solution: solutionWord,
  };

  functions.logger.info("Going to save to the database");
  const docName = solutionIndex >= 1500 ? "wordle2" : "wordle";
  const entry = db.collection("gameStats").doc(docName);
  const currentData = entry ? (await entry.get()).data() || {} : {};
  functions.logger.info("Get completed");
  currentData[day] = statsResult;
  const retVal = await entry.set(currentData);
  functions.logger.info("Data updated. Result value: ", retVal);

  functions.logger.info("Updated record", statsResult);
};

// TODO

// It looks like you're using the development build of the Firebase JS SDK.
// When deploying Firebase apps to production, it is advisable to only import
// the individual SDK components you intend to use.

// For the module builds, these are available in the following manner
// (replace <PACKAGE> with the name of a component - i.e. auth, database, etc):

// CommonJS Modules:
// const firebase = require('firebase/app');
// require('firebase/<PACKAGE>');

// ES Modules:
// import firebase from 'firebase/app';
// import 'firebase/<PACKAGE>';
