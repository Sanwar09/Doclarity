// A mock legal document to simulate the file upload content.
// In a real-world scenario, you would read the content of the uploaded file.
const mockLegalDocument = `
MEMORANDUM OF UNDERSTANDING

THIS MEMORANDUM OF UNDERSTANDING ("MOU") is made and entered into as of this 24th day of August, 2025,
by and between Party A, a corporation organized and existing under the laws of the State of Delaware, with its principal place of business at 123 Main Street, Anytown, DE 12345 ("Party A"), and Party B, a corporation organized and existing under the laws of the State of New York, with its principal place of business at 678 Market Street, Othertown, NY 67890 ("Party B").

1. PURPOSE
The purpose of this MOU is to set forth the general terms and conditions for a collaborative partnership between Party A and Party B, hereinafter referred to as the "Parties," with the objective of exploring and developing a joint venture to address the market for renewable energy solutions.

2. SCOPE OF WORK
2.1 Party A shall be responsible for providing technical expertise and resources related to solar panel technology.
2.2 Party B shall be responsible for providing marketing, distribution, and logistical support.
2.3 The Parties will establish a Joint Steering Committee to oversee the project's progress and make decisions.

3. CONFIDENTIALITY
The Parties agree to keep all information, documents, and data disclosed by one Party to the other in connection with this MOU strictly confidential. This obligation shall survive the termination of this MOU for a period of five (5) years.

4. TERM
This MOU shall commence on the date first written above and shall continue in full force and effect for a period of twelve (12) months, unless earlier terminated by mutual written agreement of the Parties.

5. NON-BINDING
This MOU is intended to serve as an outline of the Parties' intentions and does not create any legally binding obligations on either Party. A definitive, legally binding agreement shall be executed at a later date if the Parties decide to proceed with the joint venture.

IN WITNESS WHEREOF, the Parties have executed this MOU as of the date first above written.
`;

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const dragArea = document.getElementById('drag-area');
    const fileNameDisplay = document.getElementById('file-name');
    const simplifyBtn = document.getElementById('simplify-btn');
    const resultsContainer = document.getElementById('results-container');
    const originalDocDisplay = document.getElementById('original-document');
    const simplifiedDocDisplay = document.getElementById('simplified-document');
    
    // API Key for Gemini API (provided by the Canvas environment)
    const apiKey = ""; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    let selectedFile = null;

    // --- File Input and Drag-and-Drop Handling ---
    
    // Handle file selection from the input button
    fileInput.addEventListener('change', (event) => {
        selectedFile = event.target.files[0];
        if (selectedFile) {
            fileNameDisplay.textContent = `Selected file: ${selectedFile.name}`;
            simplifyBtn.disabled = false;
        } else {
            fileNameDisplay.textContent = '';
            simplifyBtn.disabled = true;
        }
    });

    // Handle drag events on the drag-and-drop area
    dragArea.addEventListener('dragover', (event) => {
        event.preventDefault();
        dragArea.classList.add('drag-active');
    });

    dragArea.addEventListener('dragleave', () => {
        dragArea.classList.remove('drag-active');
    });

    dragArea.addEventListener('drop', (event) => {
        event.preventDefault();
        dragArea.classList.remove('drag-active');
        selectedFile = event.dataTransfer.files[0];
        if (selectedFile) {
            fileInput.files = event.dataTransfer.files; // Sync the file input with the dropped file
            fileNameDisplay.textContent = `Selected file: ${selectedFile.name}`;
            simplifyBtn.disabled = false;
        }
    });

    // --- AI Functionality for Simplification ---

    // Function to handle the simplification process
    simplifyBtn.addEventListener('click', async () => {
        if (!selectedFile) {
            // Replaced alert() with an on-page message
            simplifiedDocDisplay.innerHTML = `<p class="error-message">Please select a file first.</p>`;
            return;
        }

        // Display the original document (using the mock content)
        originalDocDisplay.innerHTML = `<pre>${mockLegalDocument}</pre>`;
        resultsContainer.classList.remove('hidden');

        // Show a loading message
        simplifiedDocDisplay.innerHTML = '<div class="loading-spinner"></div><p>Simplifying your document with AI...</p>';

        // Simulate reading the file content for the AI call
        const documentContent = mockLegalDocument;

        try {
            // Build the prompt for the AI model
            const prompt = `You are a helpful assistant that simplifies legal documents. Take the following legal text and provide a concise, easy-to-understand summary. Use simple language and avoid jargon. The summary should be presented as a bulleted list of key takeaways.

Legal Document:
${documentContent}`;
            
            // Prepare the payload for the Gemini API call
            const payload = {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            };

            // Make the API call to the Gemini model
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            // Handle potential HTTP errors with more detail
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || `API call failed with status: ${response.status}`;
                throw new Error(errorMessage);
            }

            const result = await response.json();
            
            // Extract the generated text from the response
            const simplifiedText = result.candidates[0].content.parts[0].text;

            // Display the simplified text
            simplifiedDocDisplay.innerHTML = simplifiedText;

        } catch (error) {
            console.error('Error simplifying document:', error);
            simplifiedDocDisplay.innerHTML = `<p class="error-message">Failed to simplify the document. Please try again. Error: ${error.message}</p>`;
        }
    });
});
