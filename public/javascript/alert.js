let str;
document.body.style.opacity = 0;
str = prompt('Enter your password : ');
while (str !== 'gkkhator') {
    str = prompt('Enter your password : ');
}
document.body.style.opacity = 1;
