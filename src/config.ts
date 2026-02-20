const config = {
  api: {
    url: 'https://a2sv-companion.vercel.app/api',
    // url: 'http://localhost:5000/api',
  },
  /** Google Apps Script web app URL – used for sheet submissions (extension calls this directly) */
  sheet: {
    url: 'https://script.google.com/macros/s/AKfycbwNulp3XsBOlHEfpUU0WAZ-IkqOW3dNDBzchtZJzmx1UczJRT_mtcvXFlKQZbmkRr3qLw/exec',
  },
};

export default config;
