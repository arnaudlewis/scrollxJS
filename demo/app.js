var options = [
  {
    'key': 'first-step',
    'wrapper' : '#first-step',
    'timeFactor' : 1,
    'animations' :  [
      { // title
        'key': 'titleFadeOut',
        'selector': '.title',
        'steps': [
          {
            'start': '0%',
            'duration': '100%',
            'properties': {
              'translateY': {'from': '0%', 'to': '-100%'},
              'color': {'from': scrollx.Color(0, 0, 0, 1), 'to': scrollx.Color(255, 255, 255, 1)}
            }
          }
        ]
      },
      { // title
        'key': 'titleFadeIn',
        'selector': '.title2',
        'steps': [
          {
            'start': '0%',
            'duration': '100%',
            'properties': {
              'translateY': {'from': '100%', 'to': '0%'},
              'opacity': {'from': 0, 'to': 1}
            }
          }
        ]
      }
    ]
  },
  {
    'key': 'second-step',
    'wrapper' : '#second-step',
    'timeFactor' : 1,
    'animations' :  [
      { // title
        'key': 'titleFadeOut',
        'selector': '.title',
        'steps': [
          {
            'start': '0%',
            'duration': '100%',
            'properties': {
              'translateY': {'from': '0%', 'to': '-100%'},
              'color': {'from': scrollx.Color(0, 0, 0, 1), 'to': scrollx.Color(255, 255, 255, 1)}
            }
          }
        ]
      },
      { // title
        'key': 'titleFadeIn',
        'selector': '.title2',
        'steps': [
          {
            'start': '0%',
            'duration': '100%',
            'properties': {
              'translateY': {'from': '100%', 'to': '0%'},
              'opacity': {'from': 0, 'to': 1}
            }
          }
        ]
      }
    ]
  }
]

var animationNode = document.querySelector('#my-animation')
scrollx.init(animationNode, options)