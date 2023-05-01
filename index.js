import puppeteer from 'puppeteer';
import readline from 'readline'

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
const accuracyInfoSelector = '.accuracy-info-section';

const questionSelector = '#questionText';

const browser = await puppeteer.launch({
    headless: false, // 'new',
    defaultViewport: {
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

    await page.type(quizitInputSelector, roomCode);
    await page.click(quizitGetAnswersButton);

    await page.waitForSelector(quizitCardSelector);

    return await extractAnswers(page);
};

async function extractAnswers(page) {
    return await page.evaluate(async () => {
        const cards = document.querySelectorAll('div.rounded-xl');

        return Array.from(cards).map((card) => {
            const question = card.querySelector('div.rounded-xl h5').innerText.trim()
                .replace(/\n+/g, ' ')       // Заменяет символы перевода строки на пробел
                .replace(/\s{2,}/g, ' ')    // Удаляет пробел, если встречается 2+ подряд
                .replace(/\u00A0/g, ' ');   // Заменяет неразрывный пробел на обычный (внешне они не отличаются, но для js есть разница)
            const answer = card.querySelector('div.rounded-xl div').innerText.trim()
                .split('\n')
                .filter(str => str !== '');
            return {question, answer};
        });
    });
}

async function inputName(page, name) {
    await page.waitForSelector('.enter-name-field');
    await page.type('.enter-name-field', name);
}

async function configureQuizziz(page) {
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

async function extractTextFromElement(page, selector) {
    const element = await page.$(selector);
    if (!element) return '';

    let text = await page.evaluate(el => el.innerText.trim(), element);
    const children = await page.$$(selector + ' > *');
    const childTexts = await Promise.all(children.map(child => extractTextFromElement(page, selector + ' > ' + child.tagName)));

    text = text + childTexts.join('\n').trim();
    text = text
        .replace(/\s{2,}/g, ' ')    // Удаляет пробел, если встречается 2+ подряд
        .replace(/\n+/g, " ")       // Заменяет символы перевода строки на пробел
        .trim();
    return text;
}

async function clickOnRandomAnswer(page) {
    await page.waitForSelector('.option');
    const options = await page.$$('.option');
    const r = Math.floor(Math.random() * options.length);
    try {
        await options[r].click();
    } catch (e) {
        console.log('Node detached from document, trying again...')
    }
    console.log('Choosing randomly');

    const button = await page.$(submitAnswerButton);
    if (button) await button.click();
}

// TODO: Refactor this function
async function clickOnCorrectAnswer(page, answers) {
    await page.waitForSelector('#questionText');
    const question = (await extractTextFromElement(page, questionSelector)).trim();
    console.log('Extracted question: ' + question);

    if (await page.$('.typed-option-input')) {
        const card = answers.find(card => card.question === question);
        if (!card) return;
        await page.type('.typed-option-input', card.answer[0]);
        return;
    }

    const options = await page.$$('.option');

    let optionsText;
    try {
        optionsText = await Promise.all(options.map(async (option) => {
            return option.$eval('.textContainer', el => el.textContent.trim());
        }));
    } catch (error) {
        console.warn('Options with images not supported yet, picking randomly...')
        const optionImage = await page.$('.option-image');
        try {
            await optionImage.click();
        } catch (e) {
            console.log('Node detached from document, trying again...')
        }
        return;
    }

    let found = false;
    for (let i = 0; i < answers.length; i++) {
        const card = answers[i];
        if (card.question !== question) continue;

        await page.waitForSelector('.option');
        const options = await page.$$('.option');
        const answerIndex = optionsText.findIndex(text => card.answer.includes(text));

        if (answerIndex >= 0) {
            try {
                await options[answerIndex].click();
                console.log('Answer found: ' + optionsText[answerIndex]);
            } catch (error) {
                console.log('Node detached from document, trying again...')
                return;
            }
            found = true;
        }
    }

    if (!found) {
        console.warn('No answer found! Picking randomly');
        await clickOnRandomAnswer(page);
    }

    const button = await page.$(submitAnswerButton);
    if (button) await button.click();
}

async function inputAnswerAndSubmit(answers, page) {
}

const initQuizizzBot = async (name, roomCode, answers, probability, timeOnQuestion) => {
    const page = await browser.newPage();
    await page.goto(`https://quizizz.com/join?gc=${roomCode}`);

    await configureQuizziz(page);
    // await inputName(page, name);
    // await startGame(page);

    while (true) {

        await handleAnnoyingPopups(page);
        await handleRedemptionQuestions(page);

        if (await page.$('.option')) {
            if (probability >= Math.random() || await page.$('.typed-option-input')) {
                await clickOnCorrectAnswer(page, answers);
            } else {
                await clickOnRandomAnswer(page);
            }
        }

        if (await page.$(levelFeedbackSelector)) {
            const toSummary = await page.$(toSummarySelector);
            if (toSummary) await toSummary.click();
            console.log('skipped level feedback')
            break;
        }

        if (await page.$(accuracyInfoSelector)) {
            console.log('quiz done!')
            break;
        }

        await new Promise(resolve => setTimeout(resolve, timeOnQuestion));
    }

    await page.waitForSelector(accuracyInfoSelector);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const path = 'result.png'
    await page.screenshot({path});
    console.log(`Screenshot saved as: ${path}`);
    console.log('You can close your browser now.');
};

const prompt = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Номер тестовой комнаты с рандомной викториной:
let roomCode;
let name = Math.random().toString();
let probability = 0.8;
let timeOnQuestion = 10000;

console.log(
    "\nIt's an app that automates solving your quizizz tests in chromium browser.\n" +
    "At the time this app can cycle through all questions checking a webpage every 2 seconds. " +
    "It skips all distracting popups and clicks on cards with correct answers with defined probability, " +
    "to imitate person who can make mistakes. " +
    "After test ends it automatically screenshots page with results and saves image in current directory.\n" +
    "If this app not working as expected or crashes feel free to create issue on project's page:\n" +
    "https://github.com/feelswhiteman/quizizz-bot\n" +
    "or contact me on Telegram: @FeelsWhiteMan" +
    "\n\n" +
    "Before running app on your school quiz it's recommended to test it on some random quiz on the internet to " +
    "see if it's working as expected.\n" +
    "Set up live quiz such as this using your quizizz account: \n" +
    "https://quizizz.com/admin/quiz/5d0715fb518bb8001aae027d/english-challenge?fromSearch=true&source=null\n" +
    "and pass room code into this app.\n"
);

prompt.question('Input room code: ', answer => {
    roomCode = answer;
    prompt.question('Input the probability of choosing correct answer (default: 0.8): ', answer => {
        probability = answer || '0.8';
        prompt.question('Input the estimated time spent on each question in seconds (default: 10): ', answer => {
            timeOnQuestion = answer * 1000 || 10000;
            prompt.close();
        });
    });
});

prompt.on('close', async () => {
let answers = await getAnswersFromQuizit(roomCode);
console.log(answers);
await initQuizizzBot(name, roomCode, answers, probability, timeOnQuestion);
})

