import puppeteer from "puppeteer";

// quizziz selectors
const leaderboardSelector = '.leaderboard-wrapper';
const powerupSelector = '.powerup-award-container';
const usePowerupButton = '.apply-now';
const continueButton = '.right-navigator';
const submitAnswerButton = '.submit-button';

const redemptionSelector = '.screen-redemption-question-selector';
const redemptionQuestionButton = '.gradient-container';

const levelFeedbackSelector = '.first-level-feedback';
const toSummarySelector = '.skip-summary';
const gameOverSelector = '.screen-game-over';
const accuracyInfoSelector = '.accuracy-info-section';


const browser = await puppeteer.launch({
    headless: false,
    defaultViewport:
        {
        height: 800,
        width: 1200
    }
});

// quizit selectors
const quizitInputSelector = 'input[type="text"][placeholder="Pin or Link"]';
const quizitGetAnswersButton = 'button[type="button"].bg-blue-500';
const quizitCardSelector = 'div.rounded-xl';

const getAnswersFromQuizit = async (roomCode) => {
    const page = await browser.newPage();
    await page.goto('https://quizit.online/services/quizizz/');

    // await page.type(quizitInputSelector, 'https://quizizz.com/join/quiz/5e23a5fd4b061d001b80b842/start');
    await page.type(quizitInputSelector, roomCode);
    await page.click(quizitGetAnswersButton);

    await page.waitForSelector(quizitCardSelector);
    return await extractAnswers(page);
};

async function extractAnswers(page) {
    return await page.evaluate(async () => {
        const cards = document.querySelectorAll('div.rounded-xl');

        return Array.from(cards).map((card) => {
            const question = card.querySelector('div.rounded-xl h5').innerText;
            const answer = card.querySelector('div.rounded-xl div')
                .innerText.split('\n').filter(str => str !== '');
            return { question, answer };
        });
    });
}

async function inputName(page, name) {
    await page.waitForSelector('.enter-name-field');
    await page.type('.enter-name-field', name);
}

async function configureQuizziz(page, name) {
    await page.waitForSelector('.toggle-button');
    await page.evaluate(() => {
        const buttons = document.querySelector('.game-settings-list')
            .querySelectorAll('.toggle-button');
        buttons.forEach(button => {
            button.click()
        });
    });
}

async function startGame(page) {
    const buttonSelector1 = '.start-game';
    await page.waitForSelector(buttonSelector1);
    await page.click(buttonSelector1);

    const buttonSelector2 = '.start-btn';
    await page.waitForSelector(buttonSelector2);
    await page.click(buttonSelector2);
}

async function handleAnnoyingPopups(page) {
    if (await page.$(leaderboardSelector)) {
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

    if (await page.$(usePowerupButton)) {
        const button = await page.$(usePowerupButton);
        if (button) {
            await button.click();
        }
        console.log('annoying powerup used');
    }
}

async function handleRedemptionQuestions(page) {
    if (await page.$(redemptionSelector)) {
        const button = await page.$(redemptionQuestionButton);
        if (button) {
            await button.click();
        }
        console.log('redemption question picked');
    }
}

async function clickOnCorrectAnswers(page, answer) {
    const options = await page.$$('div.option');
    for (let i = 0; i < options.length; i++) {
        const optionText = await options[i].$eval('div.resizeable p', el => el.innerText);
        if (answer.includes(optionText)) {
            await options[i].click();
        }
    }
    const button = await page.$(submitAnswerButton);
    if (button) await button.click();
}

async function extractQuestionFrom(page) {
    return await page.evaluate(() => {
        const text = document.querySelector('#questionText p').innerText;
        return text ? text : '';
    });
}

async function getAnswerOn(question, answers) {
    const card = await answers.find(card => card.question === question);

    let answer = await card ? card.answer : null;
    await console.log(question);
    console.log(answer);
    return answer;
}

const initQuizziz = async (name, roomCode, answers) => {
    const page = await browser.newPage();
    await page.goto(`https://quizizz.com/join?gc=${roomCode}`);
    // await page.goto(`https://quizizz.com/join/quiz/5e23a5fd4b061d001b80b842/start`);

    await configureQuizziz(page, name);
    // await inputName(page, name);
    // await startGame(page);

    while(true) {

        if (await page.$(levelFeedbackSelector)) {
            const toSummary = await page.$(toSummarySelector);
            if (toSummary) await toSummary.click();
            console.log('skipped level feedback')
            break;
        }

        if(await page.$(accuracyInfoSelector)) {
            console.log('quiz done!')
            break;
        }

        const questionSelector = '#questionText p';

        if (await page.$(questionSelector)) {
            let question = await extractQuestionFrom(page);
            let answer = await getAnswerOn(question, answers);
            await clickOnCorrectAnswers(page, answer);
        }

        await handleAnnoyingPopups(page);
        await handleRedemptionQuestions(page);

        await new Promise(resolve => setTimeout(resolve, 1200));
    }

};


let roomCode = '21153327';
let name = '**';
let answers = await getAnswersFromQuizit(roomCode);
console.log(answers);
await initQuizziz(name, roomCode, answers);



