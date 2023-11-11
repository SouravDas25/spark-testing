const axios = require('axios');
const fs = require('fs');
const path = require('path');

// API endpoint URL for file download
const apiUrl = 'http://localhost:8000/download/test-file.txt';

// Set the directory where you want to save the downloaded files
const saveDirectory = path.join(__dirname, 'downloaded_files');


async function downloadFile() {
    const response = await axios.get(apiUrl, {responseType: 'arraybuffer'});

    // Generate a unique filename (e.g., timestamp)
    const filename = `file_${Date.now()}.txt`;

    // Save the downloaded file to the specified directory
    const filePath = path.join(saveDirectory, filename);
    fs.writeFileSync(filePath, response.data);

    console.log(`File ${filename} downloaded and saved successfully.`);
}

const parallelDownload = async () => {

    // fs.unlinkSync(saveDirectory);

    // Create the directory if it doesn't exist
    if (!fs.existsSync(saveDirectory)) {
        fs.mkdirSync(saveDirectory);
    }

    // Define the number of API calls per minute
    const callsPerMinute = 10;

    // Calculate the time interval between API calls
    const interval = 60 * 1000 / callsPerMinute;

    const prs = [];
    // Perform API calls
    for (let i = 1; i <= callsPerMinute; i++) {
        try {
            // Make an API call to download the file
            prs.push(downloadFile());
        } catch (error) {
            console.error('Error downloading file:', error.message);
        }

        // Wait for the specified interval before making the next API call
        // await new Promise(resolve => setTimeout(resolve, interval));
    }

    await Promise.all(prs);
    console.log(`Finished ${callsPerMinute} API calls per minute.`);
};

// Start the program
parallelDownload();
