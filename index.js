import puppeteer from "puppeteer";

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
    await page.type(inputSelector, roomCode);

    const buttonSelector = 'button[type="button"].bg-blue-500';
    await page.waitForSelector(buttonSelector);
    await page.click(buttonSelector);

    await page.waitForSelector('div.rounded-xl');

    return await page.evaluate(() => {
        const cards = document.querySelectorAll('div.rounded-xl');

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

    await page.waitForSelector('.toggle-button');
    await page.evaluate( () => {
        const buttons = document.querySelectorAll('.toggle-button');
        buttons.forEach(button => {
            button.click()
        });
    });

    await page.waitForSelector('.enter-name-field');
    await page.type('.enter-name-field', name);

    const buttonSelector1 = '.start-game';
    await page.waitForSelector(buttonSelector1);
    await page.click(buttonSelector1);

    const buttonSelector2 = '.start-btn';
    await page.waitForSelector(buttonSelector2);
    await page.click(buttonSelector2);

    while(true) {
        const questionSelector = '.textContainer';
        await page.waitForSelector(questionSelector);
        const question = await page.evaluate(() => {
            let text = document.querySelector('.textContainer').innerText;
            console.log(text);
            return text ? text : '';
        });
        // TODO: Map(question, answer) => answer
        console.log(question);
    }
};


let roomCode = '21153327';
let name = '**';
let answers = await getAnswers(roomCode);
console.log(answers);
await startQuizziz(name, roomCode, answers);