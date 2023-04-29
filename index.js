import puppeteer from "puppeteer";

// TODO: {
const powerupSelector = 'powerup-award-container';
const leaderboardWrapper = 'leaderboard-wrapper';
const transitionerContainer = 'transitioner-container';
const optionGrid = 'options-grid'
const option1 = 'options-1'
const option2 = 'options-2'
const option3 = 'options-3'
const option4 = 'options-4'
const scorebarContainer = 'scorebar-container';
const screenRedemption = 'screen-redemption-question-selector';
const redemptionButtonChoice = 'gradient-container';
const endScreen = 'accuracy-info-section';

const shouldPowerup = 'apply-now';
const continueButton = 'right-navigator';
const submitAnswerButton = 'submit-button';
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

        await page.waitForSelector(questionSelector);
        const question = await page.evaluate(() => {
            let text = document.querySelector('#questionText p').innerText;
            console.log(text);
            return text ? text : '';
        });
        const card = await answers.find(card => card.question === question);
        const answer =  await card ? card.answer : null;
        await console.log(question);
        await console.log(answer);

        await Promise.race([
            page.waitForSelector(powerupSelector, { timeout: 0 }),
            page.waitForSelector(leaderboardWrapper, { timeout: 0 }),
            page.waitForSelector(endScreen, { timeout: 0 })
        ]);

        if(await page.$(endScreen)) {
            console.log('done')
            break;
        }

        if (await page.$(powerupSelector)) {
            const button = await page.$(shouldPowerup);
            if (button) {
                await button.click();
            }
        }

        if (await page.$(leaderboardWrapper)) {
            const button = await page.$(continueButton);
            if (button) {
                await button.click();
            }
        }

    }
};


let roomCode = '21153327';
let name = '**';
let answers = await getAnswers(roomCode);
console.log(answers);
await startQuizziz(name, roomCode, answers);



