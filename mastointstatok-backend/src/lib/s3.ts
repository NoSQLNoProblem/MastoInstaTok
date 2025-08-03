import AWS from "aws-sdk"
const s3 = new AWS.S3(); 

export async function uploadToS3(base64 : string, mimeType : string, bucket : string, filename : string) {
  const buffer = Buffer.from(base64, "base64");
  const extension = mimeType.split("/")[1];
  const key = `${filename}${Date.now()}.${extension}`;
  const params = {
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  };
  const result = await s3.upload(params).promise();
  return result.Location; 
}

module.exports = { uploadToS3 };

