
import Papa from 'papaparse';

import express from "express";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';

import clipboard from "clipboardy";

const app = express()

app.listen(5234)

import { keyboard, Key, mouse, straightTo, centerOf, Button, screen, imageResource, Point, left, getActiveWindow, sleep } from "@nut-tree/nut-js";
import "@nut-tree/template-matcher"; 

// Typing speed
keyboard.config.autoDelayMs = 0;

// autoHighlighting images
screen.config.autoHighlight = true;

mouse.config.mouseSpeed = 4000;

class City  {
    constructor (cityName, numJobs) {
        this.cityName = cityName;
        this.numJobs = numJobs;
    }
}

let csvExport = []

const readCSV = async (filePath) => {
    const csvFile = readFileSync(filePath)
    const csvData = csvFile.toString() 

    return new Promise(resolve => {
      Papa.parse(csvData, {
        complete: results => {
          console.log('Found', results.data.length, 'results.'); 

          const flatten = items => {

            const flattenedArray = [];
          
            items.forEach(item => {
              if (Array.isArray(item)) {
                flattenedArray.push(...flatten(item));

              } else {
                flattenedArray.push(item);
              }

            });
          
            return flattenedArray;
          }

          const flattenedResults = []
          for(const result of flatten(results.data)) {

            // Makes sure no empty strings get pushed, or some weird nonsense string
            if(result.includes("http")){
                flattenedResults.push(result)
            }
          }

          resolve(flattenedResults);
          console.log(flattenedResults)
        }

      });

    });

  };


const truePress = async (...arrayOfKeys) => {
   
    await keyboard.pressKey(...arrayOfKeys);
    await keyboard.releaseKey(...arrayOfKeys);
}


const waitForWindowChange = async oldTitle => {
    return new Promise (async resolve => {

        let currentWindowRef = await getActiveWindow();
        let currentWindowTitle = await currentWindowRef.title

        while (oldTitle === currentWindowTitle) {
            await sleep(500)

            console.log("waiting... " + oldTitle)

            currentWindowTitle = await currentWindowRef.title

        }

        await sleep (1500)

        resolve(currentWindowTitle)
    })
}


const goThroughLinks = async () => {
    
    let parsedData = await readCSV('./links.csv')

    let windowRef = await getActiveWindow();
    let prevWindowTitle = await windowRef.title
   
    let jobNumPoint;
    let cityPoint;

    for(let i = 0; i < parsedData.length; i++) {

        const link = parsedData[i]

        // Search
        await truePress(Key.LeftControl, Key.E)

        // Backspace
        await truePress(Key.Backspace)

        // Search the link
        await keyboard.type(link)

        // Enter
        await keyboard.type(Key.Enter)

        prevWindowTitle = await waitForWindowChange(prevWindowTitle)

        const highlightMatchedImageText = async (point, numCharactersToHighlight, additionalMovements = null) => {
            // Moving to that little selector
            await mouse.move(point)

            if(additionalMovements != undefined) {
                await additionalMovements()
            }
                
            // Double clicking left
            await mouse.doubleClick(Button.LEFT)

            // Highlighting numbers
            for(let i = 0; i < numCharactersToHighlight; i++) {
                await truePress(Key.LeftShift, Key.Right)
            }

            // Saving to keyboard clipboard
            await truePress(Key.LeftControl, Key.C)

        }

     
        if(i === 0) {
            jobNumPoint = await straightTo(centerOf(screen.find(imageResource("job.png"))));
        }
        
        await highlightMatchedImageText(jobNumPoint, 20)
         

        const rawStringJobListings = clipboard.readSync()

        const ofPointer = rawStringJobListings.indexOf("of ")

        const dirtyJobNumber = rawStringJobListings.slice(ofPointer + ("of ".length) )

        let cleanStringJobNumber = ""

        for(const char of dirtyJobNumber) {
            if(!isNaN(char)) {
                cleanStringJobNumber += char
            }
        }

        const trueCleanJobNumber = Number(cleanStringJobNumber)

        console.log("Job number: " + trueCleanJobNumber)

        // Moving mouse to the city (lol)
        if(i === 0) {
            cityPoint = await straightTo(centerOf(screen.find(imageResource("upperLeft.png"))));
        }
        await highlightMatchedImageText(cityPoint, 20, async () => mouse.move(left(35)))

        const rawStringCityName = clipboard.readSync();

        const rawStringCityNameArray = rawStringCityName.replaceAll("\r", "").split("\n")

        // The city name is just the third one in the array
        const cityName = rawStringCityNameArray[2]

        csvExport.push(new City(cityName, trueCleanJobNumber))


        console.log(cityName)

        
        
    }

    // Kill tab
    await truePress(Key.LeftControl, Key.W)
    


}


/**Basically set time out, but I can wait for it, so less nesting */
const timeoutAwait = (lambda, time) => {
    return new Promise(resolve => {

        const resolvedFunction = async () => {
            await lambda()
            resolve()
        }
        
        setTimeout(resolvedFunction, time)

    })
    
}


const writeCSV = () => {

    const currentDate = new Date()

    const monthArray = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

    const month = monthArray[currentDate.getMonth()]

    const day = currentDate.getDate()

    const year = currentDate.getFullYear()

    const hours = currentDate.getHours() + "h";

    const minutes = currentDate.getMinutes() + "m";

    const seconds = currentDate.getSeconds() + "s";

    console.log(JSON.stringify(csvExport))

    const directory = String.raw`..\CraigslistCSV`;

    if(!existsSync(directory)){
        mkdirSync(directory)
    }

    try {
        //writeFileSync(directory + "\\" + month + "-" + day + "-" + year + ".csv", csvExport, 'utf-8')
        writeFileSync(directory + "\\" + month + "-" + day + "-" + year + "-"+ hours + "-" + minutes + "-" + seconds + ".csv", csvExport, 'utf-8')
        console.log("write successful")
    } catch (e) {
        
        if(e.code === "EBUSY") {

            console.log("error code: EBUSY, attempting to write")
           
        }
    }
}

const main = async () => {

    // Go to windows start
    await mouse.move(straightTo(new Point(0, await screen.height())))

    // Click on the button
    await mouse.click(Button.LEFT)

    // Type Chrome
    await timeoutAwait(async () => keyboard.type("Chrome"), 500)

    // Launch Chrome
    await timeoutAwait(async () => truePress(Key.Enter), 1000)

    await timeoutAwait(goThroughLinks, 1500)

    csvExport = Papa.unparse(csvExport)

    await timeoutAwait (writeCSV, 1500)

    console.log("Script finished")

    //throw new Error("End of script")
    
}

main()