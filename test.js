// 1. Select all elements with the class name 'my-class'
const elements = document.querySelectorAll('.awsui_link_l0dv0_1pmbv_400');

// 2. Map over the elements to get their text content
const allText = Array.from(elements).map(element => element.href).join(" ");

// 3. Log the resulting array to see all the text content
console.log(allText);







aws-native.pdf
aws-native_logs.pdf
aws-native_logs_setup.pdf
aws-native_logs_setup_cloudwatchlogs.pdf