import ReceiveSharingIntent from 'react-native-receive-sharing-intent';

export const listenSharedPdf = callback => {
  try {
    ReceiveSharingIntent.getReceivedFiles(
      files => {
        if (!files || files.length === 0) return;

        const pdfFile = files.find(file => {
          const name = file.fileName || file.name || '';
          const type = file.mimeType || file.type || '';

          return (
            type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')
          );
        });

        if (!pdfFile) return;

        callback({
          uri: pdfFile.filePath || pdfFile.contentUri || pdfFile.weblink,
          name: pdfFile.fileName || pdfFile.name || 'shared-challan.pdf',
          type: 'application/pdf',
        });
      },
      error => {},
      'IVProductionShare',
    );
  } catch (error) {}
};

export const clearSharedPdf = () => {
  try {
    ReceiveSharingIntent.clearReceivedFiles();
  } catch (error) {}
};
