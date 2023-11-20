const mutexify = require('mutexify/promise')


const lock = mutexify()

const checkCount = new Map();

const generateRandomString = (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};

async function increment(key, wait_time) {
    const release = await lock();

    console.log("in increment", wait_time);
    let val = 1;
    if (checkCount.has(key)) {
        val = checkCount.get(key);
    }
    await new Promise((resolve) => setTimeout(resolve, wait_time));
    checkCount.set(key, val + 1);
    console.log("out increment", checkCount, wait_time);
    release();
}

async function decrement(key, wait_time) {
    console.log("in decrement", wait_time);
    let val = 1;
    if (checkCount.has(key)) {
        val = checkCount.get(key);
    }
    await new Promise((resolve) => setTimeout(resolve, wait_time));
    checkCount.set(key, val - 1);
    console.log("out decrement", checkCount, wait_time);
}


async function main() {
    const key = generateRandomString(5);
    for (let i = 0; i < 10; i++) {
        let wait_for = parseInt((Math.random() * 1000).toString());
        if((parseInt((Math.random() * 100).toString()) % 2) === 0) {
            increment(key, wait_for);
        } else {
            decrement(key, wait_for);
        }
    }
    console.log(checkCount);
}

main();