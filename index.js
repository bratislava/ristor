#!/usr/bin/env node
import login from './login.js'
import ristor from './ristor.js'

(async () => {
    const args = process.argv.slice(2);

    if (args[0] === 'login') {
        await login();
    } else {
        await ristor();
    }
})()

