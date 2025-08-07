export function stripHtmlTags(htmlString: string) {
  const regex = /(<([^>]+)>)/ig; 
  return htmlString.replace(regex, '');
}