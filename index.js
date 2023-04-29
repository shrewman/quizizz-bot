import puppeteer from "puppeteer";

// TODO: {
const powerupSelector = '.powerup-award-container';
const leaderboardWrapper = '.leaderboard-wrapper';
const transitionerContainer = '.transitioner-container';
const optionGrid = '.options-grid'
const option1 = '.options-1'
const option2 = '.options-2'
const option3 = '.options-3'
const option4 = '.options-4'
const scorebarContainer = '.scorebar-container';
const screenRedemption = '.screen-redemption-question-selector';
const redemptionButtonChoice = '.gradient-container';

const gameOverSelector = '.screen-game-over';
const firstLevelFeedback = '.first-level-feedback';
const accuracyInfoSection = '.accuracy-info-section';
const toSummarySelector = '.skip-summary';
const screenSummarySelector = '.screen-summary';

const shouldPowerup = '.apply-now';
const continueButton = '.right-navigator';
const submitAnswerButton = '.submit-button';
// TODO: }

const browser = await puppeteer.launch({
    headless: false,
    defaultViewport:
        {
        height: 800,
        width: 1200
    }
});

const getAnswers = async (roomCode) => {
    const page = await browser.newPage();
    await page.goto('https://quizit.online/services/quizizz/');

    const inputSelector = 'input[type="text"][placeholder="Pin or Link"]';
    // await page.type(inputSelector, roomCode);
    await page.type(inputSelector, 'https://quizizz.com/join/quiz/5e23a5fd4b061d001b80b842/start');

    const buttonSelector = 'button[type="button"].bg-blue-500';
    await page.waitForSelector(buttonSelector);
    await page.click(buttonSelector);

    await page.waitForSelector('div.rounded-xl');

    return await page.evaluate(async () => {
        const cards = document.querySelectorAll('div.rounded-xl');

        let map = new Map();
        for (let card of cards) {
            const question = card.querySelector('div.rounded-xl h5').innerText;
            const answer = card.querySelector('div.rounded-xl div').innerText;
            console.log(question + " " + answer);
            map.set(question, answer);
        }

        console.log(map);
        return Array.from(cards).map((card) => {
            const question = card.querySelector('div.rounded-xl h5').innerText;
            const answer = card.querySelector('div.rounded-xl div').innerText;
            return {question, answer};
        });
    });
};

const startQuizziz = async (name, roomCode, answers) => {
    const page = await browser.newPage();
    await page.goto(`https://quizizz.com/join?gc=${roomCode}`);
    await page.goto('https://quizizz.com/join/quiz/5e23a5fd4b061d001b80b842/start');

    await page.waitForSelector('.toggle-button');
    await page.evaluate( () => {
        const buttons = document.querySelector('.game-settings-list')
            .querySelectorAll('.toggle-button');
        buttons.forEach(button => {
            button.click()
        });
    });

    // await page.waitForSelector('.enter-name-field');
    // await page.type('.enter-name-field', name);

    // const buttonSelector1 = '.start-game';
    // await page.waitForSelector(buttonSelector1);
    // await page.click(buttonSelector1);
    //
    // const buttonSelector2 = '.start-btn';
    // await page.waitForSelector(buttonSelector2);
    // await page.click(buttonSelector2);

    while(true) {
        const questionSelector = '#questionText p';
        let question, answer;

        if(await page.$(gameOverSelector)) {
            console.log('done game over')
            break;
        }

        if (await page.$(toSummarySelector)) {
            const toSummary = await page.$(toSummarySelector);
            if (toSummary) await toSummary.click();
            console.log('done to summary')
            break;
        }

        if(await page.$(accuracyInfoSection)) {
            console.log('done accuracy info')
            break;
        }

        if (await page.$(questionSelector)) {
            question = await page.evaluate(() => {
                const text = document.querySelector('#questionText p').innerText;
                return text ? text : '';
            });
            const card = await answers.find(card => card.question === question);
            answer =  await card ? card.answer : null;

            await console.log(question);
            let multipleAnswers = answer.split('\n').filter(str => str !== '');
            console.log(multipleAnswers);

            const options = await page.$$('div.option');
            for (let i = 0; i < options.length; i++) {
                const optionText = await options[i].$eval('div.resizeable p', el => el.innerText);
                if ( multipleAnswers.includes(optionText) ) {
                    await options[i].click();
                }
            }

            const submitButton = await page.$('.submit-button');
            if (submitButton) await submitButton.click();
        }

        if (await page.$(leaderboardWrapper)) {
            const button = await page.$(continueButton);
            if (button) {
                await button.click();
            }
            console.log('leaderboard skipped');
        }

        if (await page.$(powerupSelector)) {
            const button = await page.$(continueButton);
            if (button) {
                await button.click();
            }
            console.log('powerup gaining skipped');
        }

        if (await page.$(shouldPowerup)) {
            const button = await page.$(shouldPowerup);
            if (button) {
                await button.click();
            }
            console.log('annoying powerup used');
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

};


let roomCode = '21153327';
let name = '**';
let answers = await getAnswers(roomCode);
console.log(answers);
await startQuizziz(name, roomCode, answers);



