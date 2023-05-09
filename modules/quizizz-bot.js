const puppeteer = require('puppeteer');
// const readline = require('readline');

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

// quizit selectors
const quizitInputSelector = 'input[type="text"][placeholder="Pin or Link"]';
const quizitGetAnswersButton = 'button[type="button"].bg-blue-500';

let browser;

async function initBrowser() {
}

const getAnswersFromQuizit = async (roomCode) => {
    await initBrowser();
    const page = await browser.newPage();
    await page.goto('https://quizit.online/services/quizizz/');

    await page.type(quizitInputSelector, roomCode);
    await page.click(quizitGetAnswersButton);

    const errorElement = await page.$('.bg-red-100');
    if (errorElement) {
        const errorMessage = await page.$eval('.text-gray-500', element => element.textContent);
        throw new Error(`Quizit error: ${errorMessage}`);
    }

    console.log('Retrieving answers...')
    await page.waitForSelector('.rounded-xl');
    await new Promise(r => setTimeout(r, 5000));

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
            return { question, answer };
        });
    });
}

async function getAnswersFromSchoolCheats(roomCode) {
    console.log('In quizz-bot.js');

    browser = await puppeteer.launch({
        headless: false, // new,
        defaultViewport: {
            height: 1000,
            width: 1400,
        }
    });

    const page = await browser.newPage();
    await page.goto('https://schoolcheats.net/quizizz/');
    await page.waitForSelector('button.mt-2');

    await page.type('input.ml-2', roomCode);
    const button = await page.$('button.mt-2');
    await button.click();

    await page.type('input.password', '67ayiqfu');
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

async function handleAnnoyingPopups(page) {
    if (await page.$(leaderboardSelector)) {
        const button = await page.$(continueButton);
        if (button) {
            try {
                await button.click();
            } catch (e) {
                console.log(e);
            }
        }
        console.log('leaderboard skipped');
    }

    if (await page.$(powerupSelector)) {
        const button = await page.$(continueButton);
        if (button) {
            try {
                await button.click();
            } catch (e) {
                console.log(e);
            }
        }
        console.log('powerup gaining skipped');
    }

    if (await page.$(usePowerupButton)) {
        const button = await page.$(usePowerupButton);
        if (button) {
            try {
                await button.click();
            } catch (e) {
                console.log(e);
            }
        }
        console.log('annoying powerup used');
    }

    if (await page.$(levelFeedbackSelector)) {
        const toSummary = await page.$(toSummarySelector);
        try {
            if (toSummary) await toSummary.click();
        } catch (e) {
            console.log(e);
        }
        console.log('skipped level feedback')
    }
}

async function handleRedemptionQuestions(page) {
    if (await page.$(redemptionSelector)) {
        const button = await page.$(redemptionQuestionButton);
        if (button) {
            try {
                await button.click();
            } catch (e) {
                console.log(e);
            }
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
    // await page.waitForSelector('.option');
    const options = await page.$$('.option');
    const r = Math.floor(Math.random() * options.length);
    try {
        await options[r].click();
    } catch (e) {
        console.log('Node detached from document, trying again...')
        return;
    }
    console.log('Choosing randomly');

    const button = await page.$(submitAnswerButton);
    try {
        if (button) await button.click();
    } catch (e) {
        console.log(e);
    }
}

async function clickOnCorrectOptions(page, correctOptionIndexes) {
    const options = await page.$$('.option');

    if (!options) return;

    if (correctOptionIndexes.length === 0) {
        console.log('Answer not found.')
        await clickOnRandomAnswer(page);
    }

    try {
        for (let index of correctOptionIndexes) {
            await options[index].click();
        }
        const button = await page.$(submitAnswerButton);
        if (button) await button.click();
    } catch (e) {
        console.log('Error: Node detached from the document.');
    }
}

function getCorrectOptionIndexes(question, answers, optionsText) {
    let found = false;
    let correctOptionIndexes = [];
    for (let i = 0; i < answers.length; i++) {
        const card = answers[i];
        if (card.question !== question) continue;

        const optionIndex = optionsText.findIndex(text => card.answer.includes(text));
        if (optionIndex >= 0) {
            correctOptionIndexes.push(optionIndex);
            console.log('Answer found: ' + optionsText[optionIndex]);
            found = true;
        }
    }
    return correctOptionIndexes;
}

async function getOptionsContent(page) {
    // await page.waitForSelector('.option');
    const options = await page.$$('.option');
    if (!options) return;

    return await Promise.all(options.map(async (option) => {
        return option.$eval('.textContainer', el => el.textContent.trim());
    }));
}

async function handleMultipleChoiceQuestion(page, question, answers, probability) {
    if (probability < Math.random()) {
        await clickOnRandomAnswer(page);
    }

    try {
        const optionsContent = await getOptionsContent(page);
        const correctOptionIndexes = getCorrectOptionIndexes(question, answers, optionsContent);
        await clickOnCorrectOptions(page, correctOptionIndexes);
    } catch (e) {
        console.log('Something went wrong:');
        console.log(e);
        await clickOnRandomAnswer(page);
    }
}

async function handleInputAnswerQuestion(page, question, answers, probability) {
    const textArea = await page.$('.typed-option-input');
    if (!textArea) return;

    if (probability < Math.random()) {
        textArea.type('.');
        console.log('Sending "." in textarea due to defined probability.');
    } else {
        const card = answers.find(card => card.question === question);
        if (card) {
            await textArea.type(card.answer[0]);
            console.log('Answer found: ' + card.answer);
        } else {
            textArea.type('.');
            console.log('Answer not found. Sending "."');
        }
    }

    try {
        const button = await page.$(submitAnswerButton);
        if (button) await button.click();
    } catch (e) {
        console.log('Error: Node detached from the document.');
    }

}

async function handleOptionImage(page) {
    console.warn('Options with images not supported yet, picking randomly...')
    const optionImage = await page.$('.option-image');
    try {
        await optionImage.click();
    } catch (e) {
        console.log('Error: Node detached from document.')
    }
}

async function handleQuestions(page, answers, probability, timeOnQuestion) {
    if (!await page.$('#questionText')) return;

    await new Promise(r => setTimeout(r, timeOnQuestion));

    const question = await extractTextFromElement(page, '#questionText');
    console.log('Extracted question: ' + question);

    const multipleChoice = await page.$('.option');
    const optionInput = await page.$('.typed-option-input');
    const optionImage = await page.$('.option-image');

    if (multipleChoice) {
        await handleMultipleChoiceQuestion(page, question, answers, probability);
    } else if (optionInput) {
        await handleInputAnswerQuestion(page, question, answers, probability);
    } else if (optionImage) {
        await handleOptionImage(page);
    }
}

async function startGame(page, name) {
    await page.waitForSelector('.enter-name-field');
    await page.type('.enter-name-field', name);

    const button = await page.$('.start-game');
    await button.click();
}

const initQuizizzBot = async (name, roomCode, answers, probability, timeOnQuestion) => {
    if (!browser) {
        console.log('Browser is not initialized!');
        return;
    }

    const page = await browser.newPage();
    await page.goto(`https://quizizz.com/join?gc=${roomCode}`);

    await configureQuizziz(page);
    await startGame(page, name);

    if (roomCode.length === 8) {
        await page.waitForSelector('.start-btn');
        const startBtn = await page.$('.start-btn');
        await startBtn.click();
    }

    while (true) {
        await handleAnnoyingPopups(page);
        await handleRedemptionQuestions(page);
        await handleQuestions(page, answers, probability, timeOnQuestion);

        if (await page.$('.review-section')) {
            console.log('quiz done!')
            break;
        }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    const now = new Date();
    const path = `${now.getFullYear()}-${now.getMonth()}-${now.getDay()}_${now.getHours()}-${now.getMinutes()}_result.png`;
    await page.screenshot({ path });
    console.log(`Screenshot saved as: ${path}`);
    console.log('You can close your browser now.');
};

let roomCode = '';
let name = '';
let probability = 0.9;
let timeOnQuestion = 10000;

// console.log(
//     "\nIt's an app that automates solving your quizizz tests in chromium browser.\n" +
//     "At the time this app can cycle through all questions checking a webpage every 2 seconds. " +
//     "It skips all distracting popups and clicks on cards with correct answers with defined probability, " +
//     "to imitate person who can make mistakes. " +
//     "After test ends it automatically screenshots page with results and saves image in current directory.\n" +
//     "If this app not working as expected or crashes feel free to create issue on project's page:\n" +
//     "https://github.com/feelswhiteman/quizizz-bot\n" +
//     "or contact me on Telegram: @FeelsWhiteMan" +
//     "\n\n" +
//     "Before running app on your school quiz it's recommended to test it on some random quiz on the internet to " +
//     "see if it works as expected.\n" +
//     "Set up live quiz such as this using your quizizz account: \n" +
//     "https://quizizz.com/admin/quiz/5d0715fb518bb8001aae027d/english-challenge?fromSearch=true&source=null\n" +
//     "and pass room code into this app.\n"
// );

// const prompt = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
// });

// prompt.question('Input room code: ', answer => {
//     roomCode = answer.trim();
//     prompt.question('Input the probability of choosing correct answer (default: 0.9): ', answer => {
//         probability = answer.trim() || '0.9';
//         prompt.question('Input the estimated time spent on each question in seconds (default: 10): ', answer => {
//             timeOnQuestion = answer.trim() * 1000 || 10000;
//             prompt.question('Input your name, that will be showed up in quiz: ', answer => {
//                 name = answer;
//                 prompt.close();
//             });
//         });
//     });
// });

// prompt.on('close', async () => {
//     let answers = await getAnswersFromQuizit(roomCode);
//     console.log(answers);
//     await initQuizizzBot(name, roomCode, answers, probability, timeOnQuestion);
// });


module.exports = {
    getAnswersFromQuizit,
    getAnswersFromSchoolCheats,
    initQuizizzBot
}