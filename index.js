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


const questionSelector = '#questionText';

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
            const question = card.querySelector('div.rounded-xl h5').innerText.trim();
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
    let found = false;
    const options = await page.$$('div.option');

    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const text = await option.$eval('.resizeable', el => el.textContent);

        if (text.includes(answer)) {
            await option.click();
            found = true;
        }
    }

    // TODO: support for duplicate questions
    if(!found) {
        console.log('No answer found, maybe because of duplicate question in quiz. Not yet supported');
        console.log('Choosing random...');
        const index = Math.floor(Math.random() * options.length);
        await options[index].click();
        console.log(`Clicked on ${index + 1} card`);
    }

    const button = await page.$(submitAnswerButton);
    if (button) await button.click();
}

async function extractTextFromElement(page, selector) {
    const element = await page.$(selector);
    if (!element) return '';

    let text = await page.evaluate(el => el.innerText.trim(), element);
    const children = await page.$$(selector + ' > *');
    const childTexts = await Promise.all(children.map(child => extractTextFromElement(page, selector + ' > ' + child.tagName)));

    // Удаляет пробел, если встречается 2+ подряд
    text = text + childTexts.join('').trim();
    text = text.replace(/\s{2,}/g, ' ').trim();
    return text;
}

async function extractQuestionFrom(page) {
    const question = await extractTextFromElement(page, questionSelector);
    return question.trim();
}

async function getAnswerOn(question, answers) {
    const card = await answers.find(card => card.question.trim() === question);
    return await card ? card.answer : null;
}

const initQuizziz = async (name, roomCode, answers) => {
    const page = await browser.newPage();
    await page.goto(`https://quizizz.com/join?gc=${roomCode}`);
    // await page.goto(`https://quizizz.com/join/quiz/5e23a5fd4b061d001b80b842/start`);

    await configureQuizziz(page, name);
    await inputName(page, name);
    await startGame(page);

    console.log('========initQuiz========');
    console.log(answers);
    console.log('=================');

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

        if (await page.$(questionSelector)) {
            let question = await extractQuestionFrom(page);
            let answer = await getAnswerOn(question, answers);
            console.log(question);
            console.log(answer);
            await clickOnCorrectAnswers(page, answer);
        }

        await handleAnnoyingPopups(page);
        await handleRedemptionQuestions(page);
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
};


let roomCode = '21153327';
let name = '**';
let answers = await getAnswersFromQuizit(roomCode);
console.log(answers);
await initQuizziz(name, roomCode, answers);



