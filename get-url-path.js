const elementName = process.env.ELEMENT_NAME || 'my-class'; // Default class name if not provided

// 1. Select all elements with the class name 'my-class'
const elements = document.querySelectorAll(`.${elementName}`);

// 2. Map over the elements to get their text content
const allText = Array.from(elements).map(element => element.textContent).join(" ");

// 3. Log the resulting array to see all the text content
console.log(allText);