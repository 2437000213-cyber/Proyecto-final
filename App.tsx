import React from 'react';
import { Text, View, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';

type AppState = {
  status: 'Start' | 'normal' | 'crashed';
  trees: string;
  score: number;
  highScore: number;
  isNight: boolean;
  raining: boolean;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const CACTUS_WIDTH = 25;
const CACTUS_HEIGHT = 55;

export default class App extends React.Component<{}, AppState> {
  playerYval: Animated.Value;
  objXval: Animated.Value;
  bgXval: Animated.Value;

  rain1: Animated.Value;
  rain2: Animated.Value;
  rain3: Animated.Value;

  scoreInterval?: number;

  constructor(props: {}) {
    super(props);
    this.playerYval = new Animated.Value(0);
    this.objXval = new Animated.Value(0);
    this.bgXval = new Animated.Value(0);

    this.rain1 = new Animated.Value(0);
    this.rain2 = new Animated.Value(0);
    this.rain3 = new Animated.Value(0);

    this.state = {
      status: 'Start',
      trees: '🌲 🌴 🌳',
      score: 0,
      highScore: 0,
      isNight: false,
      raining: false,
    };
  }
 
  // -----------------------
  //      LLUVIA
  // -----------------------
  startRain() {
    if (this.state.raining) return;
    this.setState({ raining: true });

    const createLoop = (anim: Animated.Value, duration: number) => {
      anim.setValue(0);
      Animated.loop(
        Animated.timing(anim, {
          toValue: SCREEN_HEIGHT,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    };

    createLoop(this.rain1, 900);
    createLoop(this.rain2, 1400);
    createLoop(this.rain3, 1900);
  }

  stopRain() {
    this.setState({ raining: false });
    this.rain1.stopAnimation();
    this.rain2.stopAnimation();
    this.rain3.stopAnimation();
  }

  // -----------------------
  //      SALTO
  // -----------------------
  jump() {
    Animated.timing(this.playerYval, {
      toValue: -150,
      duration: 320,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    setTimeout(() => {
      Animated.timing(this.playerYval, {
        toValue: 0,
        duration: 300,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    }, 200);
  }

  // -----------------------
  //      INICIAR
  // -----------------------
  start() {
    this.objXval.stopAnimation();
    this.bgXval.stopAnimation();
    this.objXval.removeAllListeners();
    if (this.scoreInterval) clearInterval(this.scoreInterval);

    this.objXval.setValue(0);
    this.bgXval.setValue(0);
    this.playerYval.setValue(0);

    this.stopRain();

    this.setState(
      { score: 0, status: 'normal', isNight: false, raining: false },
      () => {
        this.runObstacle();
        this.runBackground();
        this.checkStatus();
        this.countScore();
      }
    );
  }

  // -----------------------
  //      OBSTÁCULOS
  // -----------------------
  runObstacle() {
    if (this.state.status !== 'normal') return;

    const randomOffset = Math.floor(Math.random() * 100) + 50;
    this.objXval.setValue(SCREEN_WIDTH + randomOffset);

    const baseDuration = 1300;
    const minDuration = 600;
    const speedFactor = Math.min(this.state.score / 50, 1);
    const duration = baseDuration - (baseDuration - minDuration) * speedFactor;

    Animated.timing(this.objXval, {
      toValue: -CACTUS_WIDTH,
      duration,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && this.state.status === 'normal') this.runObstacle();
    });
  }

  // -----------------------
  //        FONDOS
  // -----------------------
  runBackground() {
    if (this.state.status !== 'normal') return;
    this.bgXval.setValue(0);

    const baseDuration = 3000;
    const minDuration = 2000;
    const speedFactor = Math.min(this.state.score / 50, 1);

    Animated.timing(this.bgXval, {
      toValue: -500,
      duration: baseDuration - (baseDuration - minDuration) * speedFactor,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && this.state.status === 'normal') {
        const treesArray = [
          '🌲 🌴☁ 🌳',
          '🌲 🌲🌲 ☁ 🌳',
          '🌴',
          '🌳 🌳🌴 ☁ 🌴',
          '🌹🌹',
          '☁ ☁',
        ];
        const obj = treesArray[Math.floor(Math.random() * treesArray.length)];
        this.setState({ trees: obj }, () => this.runBackground());
      }
    });
  }

  // -----------------------
  //      COLISIÓN
  // -----------------------
  checkStatus() {
    this.objXval.removeAllListeners();

    const playerWidth = 30;
    const playerHeight = 40;
    const playerLeft = 0.1 * SCREEN_WIDTH;

    this.objXval.addListener(({ value }) => {
      if (this.state.status !== 'normal') return;

      const playerTop = this.playerYval.__getValue();
      const playerBottom = playerTop + playerHeight;

      const obstacleLeft = value;
      const obstacleRight = value + CACTUS_WIDTH;
      const obstacleBottom = 0;
      const obstacleTop = obstacleBottom + CACTUS_HEIGHT;

      const horizontalCollision =
        obstacleRight >= playerLeft && obstacleLeft <= playerLeft + playerWidth;
      const verticalCollision =
        playerBottom > obstacleBottom && playerTop < obstacleTop;

      if (horizontalCollision && verticalCollision) {
        this.objXval.stopAnimation();
        this.bgXval.stopAnimation();
        if (this.scoreInterval) clearInterval(this.scoreInterval);

        // --- CAMBIO AQUÍ: forzar Game Over de día ---
        this.setState({ status: 'crashed', isNight: false }, () => {
          if (this.state.score > this.state.highScore)
            this.setState({ highScore: this.state.score });
        });
      }
    });
  }

  // -----------------------
  //      SCORE + DÍA/NOCHE
  // -----------------------
  countScore() {
    if (this.scoreInterval) clearInterval(this.scoreInterval);

    this.scoreInterval = setInterval(() => {
      if (this.state.status === 'normal') {
        const newScore = this.state.score + 1;
        const isNight = Math.floor(newScore / 20) % 2 === 1;

        this.setState({ score: newScore, isNight }, () => {
          if (isNight && !this.state.raining) {
            this.startRain();
          }

          if (!isNight && !this.state.raining) {
            this.startRain();
          }

          if (this.state.raining && !isNight) {
            this.stopRain();
          }
        });
      }
    }, 500);
  }

  // -----------------------
  //      RESET
  // -----------------------
  resetGame() {
    this.objXval.stopAnimation();
    this.bgXval.stopAnimation();
    this.objXval.removeAllListeners();
    if (this.scoreInterval) clearInterval(this.scoreInterval);

    this.stopRain();

    this.objXval.setValue(0);
    this.bgXval.setValue(0);
    this.playerYval.setValue(0);

    this.setState({
      status: 'Start',
      score: 0,
      isNight: false,
      raining: false,
    });
  }

  // -----------------------
  //      RENDER
  // -----------------------
  render() {
    const bgColor = this.state.isNight ? '#222' : 'white';
    const groundColor = this.state.isNight ? '#fff' : '#000';
    const textColor = this.state.isNight ? '#fff' : '#000';

    if (this.state.status === 'Start') {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#090201',
          }}
        >
          <Animated.Text
            style={{
              fontSize: 40,
              fontWeight: 'bold',
              color: '#ffd60a',
              textShadowColor: '#000',
              textShadowOffset: { width: 3, height: 3 },
              textShadowRadius: 6,
              marginBottom: 50,
              transform: [
                {
                  translateY: this.playerYval.interpolate({
                    inputRange: [-150, 0],
                    outputRange: [-10, 0],
                  }),
                },
              ],
            }}
          >
            Dino Game
          </Animated.Text>

          <Animated.Text
            style={{
              fontSize: 70,
              marginBottom: 50,
              transform: [{ translateY: this.playerYval }],
            }}
          >
            🦖
          </Animated.Text>

          <TouchableOpacity
            onPress={() => this.start()}
            activeOpacity={0.8}
            style={{
              backgroundColor: '#28a745',
              paddingVertical: 15,
              paddingHorizontal: 40,
              borderRadius: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: 0.5,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            <Text
              style={{
                color: '#fff',
                fontSize: 22,
                fontWeight: 'bold',
              }}
            >
              START
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bgColor,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onTouchStart={() => this.jump()}
      >
        {this.state.raining && (
          <>
            <Animated.View
              style={{
                position: 'absolute',
                width: 3,
                height: 25,
                backgroundColor: 'rgba(150,150,255,0.7)',
                transform: [{ translateY: this.rain1 }],
                left: SCREEN_WIDTH * 0.2,
                top: 0,
              }}
            />
            <Animated.View
              style={{
                position: 'absolute',
                width: 3,
                height: 23,
                backgroundColor: 'rgba(150,150,255,0.5)',
                transform: [{ translateY: this.rain2 }],
                left: SCREEN_WIDTH * 0.5,
                top: 0,
              }}
            />
            <Animated.View
              style={{
                position: 'absolute',
                width: 3,
                height: 20,
                backgroundColor: 'rgba(150,150,255,0.4)',
                transform: [{ translateY: this.rain3 }],
                left: SCREEN_WIDTH * 0.8,
                top: 0,
              }}
            />
          </>
        )}

        {!this.state.isNight && (
          <>
            <View
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backgroundColor: '#f8f9fa',
                bottom: 0,
                left: 0,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: '#ffd60a',
                top: 50,
                right: 50,
              }}
            />
            <Animated.Text
              style={{
                fontSize: 30,
                position: 'absolute',
                bottom: '40%',
                left: '20%',
                transform: [{ translateX: this.bgXval }],
                opacity: 0.7,
              }}
            >
              🌵
            </Animated.Text>
            <Animated.Text
              style={{
                fontSize: 25,
                position: 'absolute',
                bottom: '38%',
                left: '50%',
                transform: [{ translateX: this.bgXval }],
                opacity: 0.6,
              }}
            >
              🪨
            </Animated.Text>
            <Animated.Text
              style={{
                fontSize: 28,
                position: 'absolute',
                bottom: '41%',
                left: '70%',
                transform: [{ translateX: this.bgXval }],
                opacity: 0.7,
              }}
            >
              🌵
            </Animated.Text>
          </>
        )}

        <Animated.Text
          style={{
            fontSize: 50,
            position: 'absolute',
            left: '10%',
            bottom: '40%',
            transform: [{ translateY: this.playerYval }, { scaleX: -1 }],
          }}
        >
          🦖
        </Animated.Text>

        <Animated.View
          style={{
            position: 'absolute',
            left: this.objXval,
            bottom: '40%',
            width: 25,
            height: 55,
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 12,
              height: 55,
              backgroundColor: '#0a0',
              borderRadius: 6,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: -6,
              top: 15,
              width: 5,
              height: 20,
              backgroundColor: '#0a0',
              borderTopLeftRadius: 3,
              borderBottomLeftRadius: 3,
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: -6,
              top: 25,
              width: 5,
              height: 15,
              backgroundColor: '#0a0',
              borderTopRightRadius: 3,
              borderBottomRightRadius: 3,
            }}
          />
        </Animated.View>

        <View
          style={{
            height: 2,
            width: '95%',
            backgroundColor: groundColor,
            bottom: '40%',
            position: 'absolute',
          }}
        />

        <Animated.Text
          style={{
            fontSize: 25,
            opacity: 0.4,
            zIndex: -10,
            left: '90%',
            position: 'absolute',
            bottom: '40%',
            transform: [{ translateX: this.bgXval }],
            color: textColor,
          }}
        >
          {this.state.trees}
        </Animated.Text>

        <Text
          style={{
            position: 'absolute',
            top: 20,
            right: 30,
            fontSize: 18,
            color: textColor,
          }}
        >
          Score: {this.state.score}
        </Text>

        {this.state.status === 'crashed' && (
          <View
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0,0,0,0.7)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
          >
            <View
              style={{
                width: '80%',
                backgroundColor: this.state.isNight ? '#333' : '#fff',
                borderRadius: 20,
                padding: 25,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: 'bold',
                  color: this.state.isNight ? '#fff' : '#c1121f',
                  marginBottom: 15,
                }}
              >
                ¡Game Over!
              </Text>

              <Text
                style={{
                  fontSize: 18,
                  color: this.state.isNight ? '#fff' : '#333',
                  marginBottom: 5,
                }}
              >
                Tu puntuación: {this.state.score} puntos
              </Text>

              <Text
                style={{
                  fontSize: 16,
                  fontWeight: 'bold',
                  color: this.state.isNight ? '#444' : '#444',
                  marginBottom: 20,
                }}
              >
                Mejor puntuación: {this.state.highScore} puntos
              </Text>

              <TouchableOpacity
                onPress={() => this.resetGame()}
                style={{
                  backgroundColor: '#28a745',
                  paddingVertical: 12,
                  paddingHorizontal: 25,
                  borderRadius: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.3,
                  shadowRadius: 5,
                  elevation: 5,
                }}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 'bold',
                  }}
                >
                  Reintentar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }
}
