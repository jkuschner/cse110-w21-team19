// change to true to test caching in development,
// and remember to clear cache after changing to false
const forceCache = false
/* global isLocalHost */
if (!forceCache && isLocalHost()) {
    console.log('Local server detected, run without caching')
} else if ('serviceWorker' in navigator) {
    // PWA service worker
    console.log('Registering service worker')
    navigator.serviceWorker.register('./pomo-sw.js', { scope: './' })
}

window.addEventListener('DOMContentLoaded', () => {
    // Store theme on refresh
    loadTheme()

    // Store long break time on refresh
    loadTimerValues()

    // Store volume on refresh
    loadVolume()

    // set mode to Pomo on start
    setPomoMode(true)
})

// load theme

/**
 * Load the selected theme from local storage, or default to 'themeOrange'
 * Theme name is saved when a theme option is clicked
 */
function loadTheme() {
    const currentTheme = setTheme(getTheme() || 'themeOrange', false)
    const themeRadios = document.forms['themeOptions'].elements['themeOption']
    for (let i = 0; i < themeRadios.length; i++) {
        const radio = themeRadios[i]
        if (radio.value == currentTheme) {
            radio.checked = true
        }
        radio.onclick = () => {
            setTheme(radio.value, true)
        }
    }
}

/**
 * Changes the theme of the entire timer
 * @param {String} theme CSS class name of the theme to set
 * @param {Boolean} save whether to save to local storage
 * @returns the new theme
 */
function setTheme(theme, save) {
    document.documentElement.className = theme
    if (save) {
        saveTheme(theme)
    }
    setFavicon(theme.substr(5))
    return theme
}

/**
 * Changes the favicon
 * @param {String} fruitName name of fruit to set the favicon to
 */
function setFavicon(fruitName) {
    document.getElementById('favicon').href = './images/favicon/' + fruitName + '_favicon.png'
}

/**
 * Gets the chosen theme (from storage)
 * @returns the chosen theme
 */
function getTheme() {
    return localStorage.getItem('theme')
}

/**
 * Save the chosen theme, also saved for next session
 * @param {String} theme CSS class name of the theme to set
 */
function saveTheme(theme) {
    localStorage.setItem('theme', theme)
}

// load work, break, long break times

let timerVals = undefined
let longBreakType = 'break15'

/**
 * Load timer values (work time, break time...) to use later
 * Load the long break type selected, which is used to access the correct break time in the loaded timer values
 * Break type is saved when a new break type is selected
 */
function loadTimerValues() {
    /* global getTimerValues */
    timerVals = getTimerValues()
    longBreakType = getLongBreak() || longBreakType
    const longBreakRadios = document.forms['breakOptions'].elements['breakOption']
    for (let i = 0; i < longBreakRadios.length; i++) {
        const radio = longBreakRadios[i]
        if (radio.value == longBreakType) {
            radio.checked = true
        }
        radio.onclick = () => {
            longBreakType = radio.value
            saveLongBreak(longBreakType)
        }
    }
}

/**
 * Saves the selected length of the long break
 * @returns length of the long break
 */
function getLongBreak() {
    return localStorage.getItem('longBreakType')
}

/**
 * Saves the chosen long break time
 * @param {String} longBreakType
 */
function saveLongBreak(longBreakType) {
    localStorage.setItem('longBreakType', longBreakType)
}

/**
 * Gets the long break time from the timerVals object
 * @returns long break time
 */
function longBreakTime() {
    return timerVals.longBreakTimes[longBreakType]
}

/**
 * Gets the break time from the timerVals object
 * @returns break time
 */
function breakTime() {
    return timerVals.breakTime
}

/**
 * Gets the work time from the timerVals object
 * @returns work time
 */
function workTime() {
    return timerVals.workTime
}

/**
 * Loads the volume
 */
function loadVolume() {
    /* global getVolume */
    const currentVolume = getVolume()
    if (currentVolume != null) {
        volumeSlider.value = currentVolume
        changeVolume()
    }
}

/**
 * Gets the selected volume
 * @returns Chosen volume
 */
function getVolume() {
    return localStorage.getItem('volume')
}

const volumeSlider = document.getElementById('volume-slider')
const volumeNumber = document.getElementById('volume-number')
const volumeImage = document.getElementById('volume-image')

/**
 * Changes the volume image (speaker) based on the selected volume
 */
function changeVolume() {
    localStorage.setItem('volume', volumeSlider.value)

    volumeNumber.innerHTML = volumeSlider.value
    alarmFocus.volume = volumeSlider.value / 100
    alarmBreak.volume = volumeSlider.value / 100
    if (volumeSlider.value == 0) {
        volumeImage.src = './images/volume-level-0.svg'
    } else if (volumeSlider.value <= 33) {
        volumeImage.src = './images/volume-level-1.svg'
    } else if (volumeSlider.value <= 66) {
        volumeImage.src = './images/volume-level-2.svg'
    } else {
        volumeImage.src = './images/volume-level-3.svg'
    }

    const value = ((volumeSlider.value - volumeSlider.min) / (volumeSlider.max - volumeSlider.min)) * 100
    volumeSlider.style.background =
        'linear-gradient(to right, var(--main-light-color) 0%, var(--main-light-color) ' + value + '%, #fff ' + value + '%, white 100%)'
}

/**
 * Shows the navigation bar
 */
const navBar = document.getElementById('navBar')
function showNav() {
    if (navBar.style.right < '1vh') {
        navBar.style.right = '1vh'
    } else {
        navBar.style.right = '-38vh'
    }
}

// User starts timer in inner circle
const innerCircle = document.getElementById('innerCircle')
const title = document.getElementById('title')
const skipButton = document.getElementById('skip')
const resetButton = document.getElementById('reset')
const timerStart = document.getElementById('timerStart')
const modalText = document.getElementById('modal-text')

let timerFunc = undefined,
    stopFunc = undefined
/**
 * Sets the pomo "mode" based on if it's focus or break time
 * @param {Boolean} isPomo true = time to focus. false = break time
 */
function setPomoMode(isPomo) {
    if (isPomo) {
        innerCircle.style.backgroundColor = 'var(--main-light-color)'
        title.innerHTML = 'Ready to Work?'
        timerStart.innerHTML = 'Start'
        modalText.innerHTML = 'Are you sure you want to break this work session? Doing so will lose your progress towards the current Pomo.'
        timerFunc = () => {
            startPomoTimer(workTime())
        }
        stopFunc = skipPomo
    } else {
        innerCircle.style.backgroundColor = 'inherit'
        title.innerHTML = 'Time For a Break'
        timerStart.innerHTML = 'Break'
        modalText.innerHTML = 'Are you sure you would like to reset your work session? Doing so will reset your pomo count to zero.'
        timerFunc = () => {
            const bt = count == NUM_POMOS ? longBreakTime() : breakTime()
            startBreakTimer(bt)
        }
        stopFunc = resetPomo
    }
}

/**
 * Shows the user the time "moving" (inside of the circle changes)
 */
function startTimerVisual() {
    innerCircle.disabled = true
    innerCircle.style.backgroundColor = 'inherit'
    timerFunc()
}

// Pomodoro Timer
let count = 0
// Timer display and fruit animation
const MS_PER_SECOND = 1000
const NUM_POMOS = 4
const pomo = document.forms['pomoDisplay'].elements['pomo']
const timeDisplay = document.getElementById('time')
const pulseCircle = document.getElementsByClassName('pulseCircle')
const alarmFocus = document.getElementById('alarm-focus')
const alarmBreak = document.getElementById('alarm-break')

/**
 * Starts the timer for the focus/ work session
 * @param {Number} seconds - length of the session
 */
function startPomoTimer(seconds) {
    title.innerHTML = 'Focus'
    timeDisplay.style.visibility = 'visible'
    skipButton.disabled = false
    displayTime(seconds)

    let hasCalled = false // prevent double callbacks
    const endCallback = () => {
        if (hasCalled) {
            return
        }
        hasCalled = true

        endTimer()
        setCount(count + 1)
        setPomoMode(false)
        alarmFocus.play()
    }
    setAccuTimeout(endCallback, seconds * MS_PER_SECOND)
    drawAnimation(endCallback, seconds, false)
}

/**
 * Starts the timer for the break session
 * @param {String} seconds - length of session
 */
function startBreakTimer(seconds) {
    title.innerHTML = 'Relax'
    timeDisplay.style.visibility = 'visible'
    resetButton.disabled = false
    displayTime(seconds)

    let hasCalled = false // avoid double callbacks
    const endCallback = () => {
        if (hasCalled) {
            return
        }
        hasCalled = true

        endTimer()
        if (count == NUM_POMOS) {
            setCount(0)
        }
        setPomoMode(true)
        alarmBreak.play()
    }
    setAccuTimeout(endCallback, seconds * MS_PER_SECOND)
    drawAnimation(endCallback, seconds, true)
}

/**
 * Counts how many pomos the user has completed
 * @param {Number} newCount
 */
function setCount(newCount) {
    count = newCount
    updatePomo()
    localStorage.setItem('count', count)
}

let timerTimeout = undefined
/**
 *
 * @param {*} endCallback
 * @param {Number} delay
 */
function setAccuTimeout(endCallback, delay) {
    const start = Date.now()

    function callback() {
        const elapsed = Date.now() - start
        if (elapsed >= delay) {
            endCallback()
        } else {
            const remainder = delay - elapsed
            timerTimeout = setTimeout(callback, remainder)
        }
    }

    timerTimeout = setTimeout(callback, delay)
}

let animation = undefined
/**
 * Draws the animation for the pomo (fills the circle when break / empty the circle when focus)
 * @param {*} endCallback
 * @param {Number} seconds
 * @param {Boolean} reverse
 */
function drawAnimation(endCallback, seconds, reverse) {
    const durationMS = seconds * MS_PER_SECOND
    let start = undefined

    function draw(timestamp) {
        if (start == undefined) {
            start = timestamp
        }
        const elapsed = timestamp - start
        if (elapsed >= durationMS) {
            endCallback()
            return
        }

        displayTime((durationMS - elapsed) / MS_PER_SECOND)
        if (!reverse) {
            drawCircleFrame(2 * Math.PI * (elapsed / durationMS))
        } else if (elapsed > 0) {
            drawCircleFrame(2 * Math.PI * (1 - elapsed / durationMS))
        }

        animation = window.requestAnimationFrame(draw)
    }

    animation = window.requestAnimationFrame(draw)
}

const border = document.getElementById('border')
/**
 * Draws the circle for the animation
 * @param {Number} alpha
 */
function drawCircleFrame(alpha) {
    let anim
    if (alpha < 0) {
        anim = 'M 0, 0 m -125, 0 a 125,125 0 1,0 250,0 a 125,125 0 1,0 -250,0'
    } else {
        const x = Math.sin(alpha) * 125,
            y = Math.cos(alpha) * -125,
            mid = alpha > Math.PI ? 1 : 0
        anim = 'M 0 0 v -125 A 125 125 1 ' + mid + ' 1 ' + x + ' ' + y + ' z'
    }
    border.setAttribute('d', anim)
}

/**
 * Sets time element in html accordingly
 * @param {Number} time - time on the pomo
 */
function displayTime(time) {
    /* global formatTime */
    timeDisplay.innerHTML = formatTime(time)
}

/**
 * Fills in the pomos (below the main circle)
 */
function updatePomo() {
    // Fill in pomo based on count
    for (let i = 0; i < pomo.length; i++) {
        pomo[i].checked = i < count
    }
}

/**
 * Finishes the timer - when the timer reaches 0 it "cleans" the circle and the environment before the next round
 */
function endTimer() {
    window.cancelAnimationFrame(animation)
    clearTimeout(timerTimeout)
    drawCircleFrame(-1)

    innerCircle.disabled = false
    skipButton.disabled = true
    resetButton.disabled = true
    timeDisplay.style.visibility = 'hidden'
    modalPopup.style.display = 'none'
}

const modalPopup = document.getElementById('modal-popup')
const modalConfirm = document.getElementById('modal-confirm')
const modalCancel = document.getElementById('modal-cancel')

modalConfirm.addEventListener('click', () => {
    modalPopup.style.display = 'none'
    stopFunc()
})

modalCancel.addEventListener('click', () => {
    modalPopup.style.display = 'none'
})

/**
 * Skips the current work session and jump to break session
 */
function skipPomo() {
    setPomoMode(false)
    endTimer()
}

/**
 * Initializes the pomo count to 0 and waiting to start a new focus session
 */
function resetPomo() {
    setCount(0)
    setPomoMode(true)
    endTimer()
}

/**
 * Shows warning when the user clicks 'skip' or 'reset'
 */
function skipOrReset() {
    modalPopup.style.display = 'block'
}
