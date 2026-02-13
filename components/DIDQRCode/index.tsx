import { Suspense } from 'react';
import QRCode from 'react-native-qrcode-svg';

const DIDQRCode = (({value, size}: {value: string, size?: number}) => {
  const qrCodeSize = size || 250; // Adjust the size of the QR code as needed

  // Convert the integer value to a string
  const qrCodeValue = String(value || ""); 

  if (!qrCodeValue) {
    return <></>;
  }

  return (
    <Suspense fallback={<></>}>
      <QRCode
        value={qrCodeValue}
        size={qrCodeSize}
        // You can customize the appearance of the QR code using props like color, backgroundColor, etc.
        // Example:
        // color="black"
        // backgroundColor="white"
      />
    </Suspense>
  );
});

export default DIDQRCode;