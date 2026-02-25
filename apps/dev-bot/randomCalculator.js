const operations = ['+', '-', '*', '/'];

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomOperation() {
    return operations[getRandomInt(0, operations.length - 1)];
}

function calculateRandom() {
    const num1 = getRandomInt(1, 100);
    const num2 = getRandomInt(1, 100);
    const operation = getRandomOperation();
    let result;

    switch (operation) {
        case '+':
            result = num1 + num2;
            break;
        case '-':
            result = num1 - num2;
            break;
        case '*':
            result = num1 * num2;
            break;
        case '/':
            // Ensure no division by zero
            if (num2 === 0) return `${num1} ${operation} ${num2} = Undefined (Division by zero)`;
            result = num1 / num2;
            break;
    }
    return `${num1} ${operation} ${num2} = ${result}`;
}

module.exports = {
    calculateRandom,
    getRandomOperation,
    getRandomInt // Exported for potential testing or utility
};
