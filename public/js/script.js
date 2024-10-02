function uploadPDF() {
    const input = document.getElementById('pdfFileInput');
    if (input.files.length === 0) {
      alert('Please select a PDF file.');
      return;
    }

    const file = input.files[0];
    const fileReader = new FileReader();

    fileReader.onload = function(event) {
      const pdfDataUrl = URL.createObjectURL(new Blob([event.target.result], { type: 'application/pdf' }));
      loadPdfInViewer(pdfDataUrl); // Pass the PDF URL to the viewer
    };

    fileReader.onerror = function() {
      console.error('Error reading the file:', fileReader.error);
      alert('Error reading the PDF file.');
    };

    fileReader.readAsArrayBuffer(file);  // Read the file as ArrayBuffer to handle binary data
  }

  function loadPdfInViewer(pdfUrl) {
    const viewer = document.querySelector('#report_viewer_element');
    const dropArea = document.getElementById('drop-area');
    
    // Show loading modal
    document.getElementById('loadingModal').style.display = 'flex';

    try {
      // Use setAttribute to set the PDF file in the viewer
      viewer.setAttribute('src', pdfUrl);
      console.log('PDF loaded successfully');
    } catch (error) {
      console.error('Error loading the PDF:', error);
      alert('Error loading the PDF file.');
    } finally {
      // Hide loading modal
      document.getElementById('loadingModal').style.display = 'none';
      dropArea.style.display = 'none';
    }
  }

document.getElementById('aiSummarizerButton').addEventListener('click', function() {
    const aiPanel = document.getElementById('viewer_container-ai');
    const body = document.body;
    const html = document.documentElement;
    // Toggle the 'show' class for the AI panel and the 'shrink' class for the viewer container
    aiPanel.classList.toggle('show');
    // Toggle the 'shrink' class on both body and html
    body.classList.toggle('shrink');
    html.classList.toggle('shrink');
});

document.getElementById('aiChatButton').addEventListener('click', function() {
    const aiPanel = document.getElementById('viewer_container-aiChat');
    const body = document.body;
    const html = document.documentElement;
    // Toggle the 'show' class for the AI panel and the 'shrink' class for the viewer container
    aiPanel.classList.toggle('show');
    // Toggle the 'shrink' class on both body and html
    body.classList.toggle('shrink');
    html.classList.toggle('shrink');
});

document.getElementById("printReport").addEventListener("click", async function() {

  const viewer = document.querySelector('#report_viewer_element')
  var test = viewer.getAttribute('src');  //viewer.getAttribute('src');
  console.log('test',test);
 // alert('viewer',viewer)
  // Wait for the viewer initialization
  if (viewer){
    //  alert('viewer');
      const viewerApp = await viewer.initialize();
      // Wait for pages loaded, open find bar and search
      var data = await viewerApp.pdfDocument.getData();
      console.log('data',data);
      //alert('url',url);
  } else {
    alert('viewer not found');
  }

  
});