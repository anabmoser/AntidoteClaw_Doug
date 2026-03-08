export const bannerTemplate = `
<!DOCTYPE html>
<html>
<head>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        
        :root {
            --bg-color: {{bgColor}};
            --accent-color: {{accentColor}};
            --font-color: {{fontColor}};
        }

        body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 0;
            width: 1080px;
            height: 1350px;
            background-color: var(--bg-color);
            color: var(--font-color);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            box-sizing: border-box;
            padding: 100px;
            position: relative;
        }

        .container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background-color: rgba(255, 255, 255, 0.03); /* Subtle internal shine over bg-color */
            backdrop-filter: brightness(1.2);
            border-radius: 40px;
            padding: 60px 80px;
            box-sizing: border-box;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            border-left: 10px solid var(--accent-color);
            overflow: hidden;
        }

        .header {
            display: flex;
            align-items: flex-start;
        }

        .numero {
            background-color: var(--accent-color);
            color: var(--bg-color);
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 36px;
            font-weight: 900;
            margin-right: 30px;
            flex-shrink: 0;
            margin-top: 5px;
        }

        .title {
            font-size: {{titleFontSize}};
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 0;
            line-height: 1.2;
        }

        .body-text {
            font-size: {{fontSize}};
            font-weight: 400;
            line-height: 1.5;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            text-align: left;
            margin-top: 40px;
        }

        .highlight-bar {
            background-color: var(--accent-color);
            padding: 24px 32px;
            border-radius: 20px;
            margin-top: 40px;
            flex-shrink: 0;
        }

        .highlight-text {
            color: var(--bg-color);
            font-size: 36px;
            font-weight: 900;
            text-align: center;
            margin: 0;
            line-height: 1.3;
        }

        /* Elemento de Aspas se for citação */
        .quote-mark {
            font-size: 100px;
            color: var(--accent-color);
            position: absolute;
            opacity: 0.3;
            top: -30px;
            left: -20px;
        }
    </style>
</head>
<body>
    <div class="container">
        {{#if title}}
        <div class="header">
            {{#if number}}
            <div class="numero">{{number}}</div>
            {{/if}}
            <h1 class="title">{{title}}</h1>
        </div>
        {{/if}}
        
        <div class="body-text">
            {{#if isQuote}}
            <div style="position: relative;">
                <span class="quote-mark">"</span>
            </div>
            {{/if}}
            <span style="white-space: pre-line;">{{body}}</span>
        </div>

        {{#if highlight}}
        <div class="highlight-bar">
            <p class="highlight-text">{{highlight}}</p>
        </div>
        {{/if}}
    </div>
</body>
</html>
`;
