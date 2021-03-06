import React, { Component } from 'react';
import './App.css';

class KanaProgress extends React.Component {
  render() {
    const furigana = [];
    let romajiLength = 0;
    const hi = { color: 'red' };
    const lo = {};
    if (this.props.kana.furigana.length > 0) {
      for (let f of this.props.kana.furigana) {
        romajiLength += f.romaji.length;
        const highlight = romajiLength <= this.props.correct;
        furigana.push(<span style={highlight ? hi : lo}>
          {f.hiragana}
        </span>);
      }
    } else {
      furigana.push(<span>&#8203;</span>);
    }
    const highlight = this.props.kana.romaji.length <= this.props.correct;
    return (
      <ruby style={highlight ? hi : lo}>{this.props.kana.kana}<rt>{furigana}</rt></ruby>
    );
  }
}

class PopoutIcon extends React.Component {
  render() {
    return (
      <div className="popout" style={{
        left: this.props.x,
        top: this.props.y,
      }}>
        {this.props.emoji}
      </div>
    );
  }
}

const errorEmoji = [
  '\uD83D\uDE13', // 😓
  '\uD83D\uDE32', // 😲
  '\uD83D\uDE16', // 😖
  '\uD83D\uDE1E', // 😞
  '\uD83D\uDE31', // 😱
];

class KanaPhrase extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      toType: props.kana.map(k => k.romaji).join(''),
      correct: '',
      errors: [],
    };
  }

  onKeyPress(event) {
    if (this.state.toType.startsWith(event.key.toLowerCase())) {
      this.setState({
        toType: this.state.toType.substring(1),
        correct: this.state.correct + event.key,
      });
      if (this.state.toType.length === 1) {
        this.props.onDone(this.state.errors.length);
      }
    } else if (this.state.toType !== '') {
      this.setState({
        errors: [...this.state.errors, {
          key: event.key,
          emoji: errorEmoji[Math.floor(Math.random() * errorEmoji.length)],
          x: `${Math.floor(Math.random() * 21 + 40)}%`,
          y: `${Math.floor(Math.random() * 21 + 40)}%`,
        }],
      });
    }
  }

  render() {
    let correct = this.state.correct.length;
    const kana = this.props.kana.map((k, i) => {
      const correctOnThis = Math.max(0, Math.min(correct, k.romaji.length));
      correct -= k.romaji.length;
      return <KanaProgress kana={k} correct={correctOnThis} key={`kana${i}`}/>
    });
    const errorIcons = this.state.errors.map(
      (e, i) => <PopoutIcon emoji={e.emoji} x={e.x} y={e.y} key={`error${i}`} />
    );
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
        }}
      >
        <div key="kana" className="kanacontainer">
          <span style={{fontSize: `${Math.floor(50 / kana.length)}vmin`}}>{kana}</span>
        </div>
        <div key="errors" className="popoutcontainer">
          {errorIcons}
        </div>
      </div>
    );
    // TODO: move input box out of here, input should be higher up
  }
};

class KanaTestStats extends React.Component {
  render() {
    const errors = this.props.stats.reduce((a, v) => a + v.errors, 0);
    const dt = this.props.stats.reduce((a, v) => a + v.dt, 0);
    return (<div>
      <div>Errors: {errors}</div>
      <div>Time: {dt / 1000}s</div>
    </div>);
  }
}

class KanaTest extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      t0: Date.now(),
      stats: [],
      index: -1,
    };
  }

  onPhraseDone(e) {
    const t = Date.now();
    this.setState({
      t0: t,
      index: this.state.index + 1,
      stats: this.state.stats.concat([{
        errors: e,
        dt: t - this.state.t0,
      }]),
    });
  }

  onFocus(e) {
    if (this.state.index === -1) {
      this.setState({index: 0});
    }
  }

  onKeyPress(e) {
    if (this.inputTarget) {
      this.inputTarget.onKeyPress(e);
    }
  }

  renderTransition(leaving, entering) {
    return (
      <div>
        <div key={`phrase ${this.state.index}`} className="rotcard" style={{animationName: 'rotin'}}>
          {entering}
        </div>
        <div key={`phrase ${this.state.index - 1}`} className="rotcard" style={{animationName: 'rotout'}}>
          {leaving}
        </div>
        <input key="input"
          type="text"
          value=""
          onFocus={e => this.onFocus(e)}
          onKeyPress={e => this.onKeyPress(e)}
          style={{
            position: 'absolute',
            fontSize: '25vmin',
            top: '0',
            left: '0',
            width: '100%',
            height: '50%',
            border: '0',
            padding: '0',
            background: 'transparent',
          }}/>
      </div>
    );
  }

  render() {
    const test = this.props.test;
    const index = this.state.index;
    if (index === -1) {
      return this.renderTransition(
        null,
        <div>Tap to start!</div>
      );
    } else if (index === 0) {
      return this.renderTransition(
        <div>Tap to start!</div>,
        <KanaPhrase kana={test[index]} onDone={e => this.onPhraseDone(e)} ref={r => {this.inputTarget = r}} />
      );
    } else if (index < test.length) {
      return this.renderTransition(
        <KanaPhrase kana={test[index - 1]} />,
        <KanaPhrase kana={test[index]} onDone={e => this.onPhraseDone(e)} ref={r => {this.inputTarget = r}} />
      );
    } else {
      return this.renderTransition(
        <KanaPhrase kana={test[test.length - 1]} />,
        <KanaTestStats stats={this.state.stats} />
      );
    }
  }
}

class Kana {
  constructor(kana, ...furiganaOrRomaji) {
    this.kana = kana;
    this.furigana = [];
    if (furiganaOrRomaji.length === 1) {
      this.romaji = furiganaOrRomaji;
    } else if (furiganaOrRomaji % 2 === 1) {
      throw 'expecting pairs of furigana and romaji, got odd number';
    } else {
      this.romaji = '';
      for (let i = 0; i < furiganaOrRomaji.length; i += 2) {
        this.furigana.push({
          hiragana: furiganaOrRomaji[i],
          romaji: furiganaOrRomaji[i+1],
        });
        this.romaji += furiganaOrRomaji[i+1];
      }
    }
  }
}

// words

const words = [
  { jlpt: 5, kana: [new Kana('あ', 'a'), new Kana('あ', 'a')], english: 'Ah!' },
  { jlpt: 5, kana: [new Kana('会', 'あ', 'a'), new Kana('う', 'u')], english: 'to meet' },
  { jlpt: 5, kana: [new Kana('青', 'あ', 'a', 'お', 'o'), new Kana('い', 'i')], english: 'blue' },
  { jlpt: 5, kana: [new Kana('赤', 'あ', 'a', 'か', 'ka'), new Kana('い', 'i')], english: 'red' },
];

class App extends Component {
  render() {
    return (
      <KanaTest test={words.map(w => w.kana)} onDone={() => window.alert(`done!`)} />
    );
  }
}

export default App;
