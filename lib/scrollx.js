import { Json } from './utils/json'
import { DOM } from './utils/dom'
import { Frame } from './utils/frame'

/* Transition functions
-------------------------------------------------- */
//t : currentTime
//b: start value
//c: change in value
//d: duration

function easeInOutQuad (t, b, c, d) {
  t /= d/2
  if (t < 1) return c/2*t*t + b
  t--
  return -c/2 * (t*(t-2) - 1) + b
}

function linear (t, b, c, d) {
  return c*t/d + b
}

function easeInQuad (t, b, c, d) {
  t /= d
  return c*t*t + b
}

function easeOutQuad (t, b, c, d) {
  t /= d
  return -c * t*(t-2) + b
}

/*  Globals
-------------------------------------------------- */
const Axis = { Y: 'y', X: 'x'}
const Property = {
  TranslateY: 'translateY',
  TranslateX: 'translateX',
  Rotate: 'rotate',
  Opacity: 'opacity',
  Scale: 'scale',
  Color: 'color',
  Fill: 'fill',
  Width: 'width',
  Top: 'top',
  Left: 'left',
  Bottom: 'bottom',
  Right: 'right'
}

const Timing = {
  EASE_IN_OUT: easeInOutQuad,
  EASE_IN: easeInQuad,
  EASE_OUT: easeOutQuad,
  LINEAR: linear
}
const defaultTransition = Timing.EASE_IN_OUT

let animOffset = 0
let animHeight = 0
const scrollTop = () => window.scrollY - animOffset

const Color = (red, green, blue, opacity = 1) => {
  return {r: parseInt(red), g: parseInt(green), b: parseInt(blue), a: opacity}
}

function filmDuration(animationNode, convertedScenes, computed) { //in PX
  const duration = convertedScenes.reduce((acc, scene) => {
    return acc + scene.timeFactor * computed[scene.key].duration
  }, 0);
  return animationNode.offsetHeight > duration ? animationNode.offsetHeight : duration;
}

function getIndex(scenes, scene) {
  return scenes.indexOf(scene)
}

function sceneStart(scenes, scene, computed) { //in PX
  const startIndex = getIndex(scenes, scene)
  const previousScenes = scenes.slice(0, startIndex)

  return previousScenes.reduce((acc, s) => {
    return acc + (s.timeFactor * computed[s.key].duration)
  }, 0)
}

function animationStepStart(scenes, computed, scene, step, animTimeFactor) { // in px
  const start = sceneStart(scenes, scene, computed)
  return start + pixelsOfScene(step.start, animTimeFactor, Axis.Y)
}

function animationStepDuration(scene, step, animTimeFactor) { // in px
  return pixelsOfScene(step.duration, animTimeFactor, Axis.Y)
}

function negativePercent(value) {
  return (/^-.+\%$/).test(value)
}

function pixelsOfScene(value, timeFactor, axis) { //in px
  if(typeof value === "string" && value.match(/%/g)) {
    if(axis === 'y') return (parseFloat(value) / 100) * window.innerHeight * timeFactor
    if(axis === 'x') return (parseFloat(value) / 100) * window.innerWidth * timeFactor
  }
}

function convertedValueOfAnimatedElement(elem, value, unit, axis) {
  if(unit && unit === '%') {
    if(axis === 'y') return (value / 100) * elem.clientHeight
    if(axis === 'x') return (value / 100) * elem.clientWidth
  } else {
    return value
  }
}

function convertScenes(scenes, computed) {
  return scenes.map((scene, index) => {
    const animations = convertAnimations(scenes, computed, scene, index)
    return Json.merge(scene, {timeFactor: scene.timeFactor || 1,'animations': animations})
  })
}

function convertAnimations(scenes, computed, scene, sceneIndex) {
  return (scene.animations || []).map((a, index) => {
    const steps = convertAnimationSteps(scenes, computed, scene, sceneIndex, a)
    return Json.merge(a, {'steps': steps})
  })
}

function convertAnimationSteps(scenes, computed, scene, sceneIndex, animation) {
  return (animation.steps || []).map((step, index) => {
    const timeF = negativePercent(step.start) ? scenes[sceneIndex - 1].timeFactor : scene.timeFactor
    const animStartHeight = animationStepStart(scenes, computed, scene, step, timeF)
    const animDurationHeight = animationStepDuration(scene, step, scene.timeFactor)
    const updatedStep = Json.merge(step, {'start': animStartHeight, 'duration': animDurationHeight})
    const properties = convertProperties(computed, scene, animation, step)
    return Json.merge(updatedStep, {'properties': properties})
  })
}

function convertProperties(computed, scene, animation, step) {
  return Json.map(step.properties, (key, value) => {
    const node = computed[scene.key].animations[animation.key].node
    let axis = null
    switch(key) {
      case Property.TranslateX: case Property.Top: case Property.Bottom: case Property.GrowthX:
        axis = Axis.X
      case Property.TranslateY: case Property.Left: case Property.Right: case Property.GrowthY:
        axis = Axis.Y
    }

    const animFrom = convertedValueOfAnimatedElement(node, value.from, value.unit, axis)
    const animTo = convertedValueOfAnimatedElement(node, value.to, value.unit, axis)
    return buildProp(animFrom, animTo, value.unit)
  })
}

function buildProp(from, to, unit) {
  return {from, to, unit}
}

function compute(scenes, animationNode) {
  //computedValue With Dom Ref
  const computed = analyseDOM(scenes, animationNode)
  //convert relative percents with px value of the total film
  const convertedScenes = convertScenes(scenes, computed)

  const duration = filmDuration(animationNode, convertedScenes, computed)
  animationNode.style.height = `${String(duration)}px`
  animOffset = getAnimationOffset(animationNode)
  animHeight = duration
  //change height property of the film in the DOM
  run(convertedScenes, computed)
}

function getAnimationOffset(elem) { // crossbrowser version
  const box = elem.getBoundingClientRect()
  const body = document.body
  const docEl = document.documentElement

  const scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop
  var clientTop = docEl.clientTop || body.clientTop || 0

  return Math.round(box.top +  scrollTop - clientTop)
}

function setup(animationNode, options) {
  //one time actions
  //~~~~~~~~~~~~~~~~~~~
  const scenes = options
  compute(scenes, animationNode)
  //reset calculations if window size has changed
  window.addEventListener('resize', (e) => compute(scenes, animationNode))
}

function analyseDOM(scenes, animationNode) {
  return scenes.reduce((sceneAcc, s) => {
    const scene = DOM.querySelector(s.wrapper, animationNode)
    const animations = s.animations.reduce((animAcc, a) => {
      const animation = DOM.querySelector(a.selector, scene)
      let computedAnim = {}
      computedAnim[a.key] = {'node': animation}
      return Json.merge(animAcc, computedAnim)
    }, {})
    let computedScene = {}
    computedScene[s.key] = {
      'node': scene,
      'duration': scene.clientHeight,
      'start': sceneStart(scenes, s, sceneAcc),
      'animations': animations
    }
    return Json.merge(sceneAcc, computedScene)
  }, {})
}

function computeProperty(step, propValue) {
  const transitionFunc = step.transition || defaultTransition
  if(scrollTop() <= step.start) return propValue.from
  else if (scrollTop() >= (step.start + step.duration)) return propValue.to
  else return transitionFunc(scrollTop() - step.start, propValue.from, propValue.to - propValue.from, step.duration)
}

function computeColor(step, colorValue) {
  const colorAsValues = [
    {from: colorValue.from.r, to: colorValue.to.r},
    {from: colorValue.from.g, to: colorValue.to.g},
    {from: colorValue.from.b, to: colorValue.to.b},
    {from: colorValue.from.a, to: colorValue.to.a}
  ]
  return colorAsValues.map((c) => computeProperty(step, c))
}

function getDefaultPropertyValue(property) {
  switch (property) {
    case Property.TranslateX:
      return formatValueWithUnit(0)
    case Property.TranslateY:
      return formatValueWithUnit(0)
    case Property.Rotate:
      return formatValueWithUnit(0)
    case Property.Scale:
      return formatValueWithUnit(1)
    case Property.Opacity:
      return formatValueWithUnit(1)
    default:
      return null
  }
}

function formatValueWithUnit(value, maybeUnit) {
  const unit = maybeUnit || 'px'
  return {value, unit}
}

function calcPropValue(step, property) {
  const propValue = step.properties[property]
  if(propValue) {
    switch(property) {
      case Property.Opacity :
        const opacityValue = Math.abs(computeProperty(step, propValue))
        return formatValueWithUnit(opacityValue, propValue.unit)

      case Property.Color: case Property.Fill:
        const c = computeColor(step, propValue)
        return Color(c[0], c[1], c[2], c[3])

      default :
        const defaultValue = computeProperty(step, propValue)
        return formatValueWithUnit(defaultValue, propValue.unit)
    }
  } else {
    return getDefaultPropertyValue(property)
  }
}

function getCurrentStep(steps) {
  const matchedStep = steps.find((step) => {
    return (
      (scrollTop() >= step.start && scrollTop() <= (step.start + step.duration))
      || step.start >= scrollTop()
    )
  })
  const matchedIndexOf = steps.indexOf(matchedStep)
  const matchedIndex = matchedIndexOf > -1 ? matchedIndexOf : steps.length - 1
  return steps[matchedIndex]
}

function computeAnimationProperties(steps) {
  const currentStep = getCurrentStep(steps)
  const computed = Object.keys(Property).reduce((acc, propKey) => {
    const obj = {}
    obj[Property[propKey]] = calcPropValue(currentStep, Property[propKey])
    return Json.merge(acc, obj)
  }, {})

  return Json.filter((p) => p !== null, computed)
}

function setCssProperties(node, properties) {
  node.style.transform = `translate3d(${properties[Property.TranslateX].value}${properties[Property.TranslateX].unit}, ${properties[Property.TranslateY].value}${properties[Property.TranslateY].unit}, 0) rotate(${properties[Property.Rotate].value}deg) scale(${properties[Property.Scale].value})`
  node.style.opacity = properties[Property.Opacity].value
  if(properties[Property.Color]) node.style.color = `rgba(${properties[Property.Color].r}, ${properties[Property.Color].g}, ${properties[Property.Color].b}, ${properties[Property.Color].a})`
  if(properties[Property.Fill]) node.style.fill = `rgba(${properties[Property.Fill].r}, ${properties[Property.Fill].g}, ${properties[Property.Fill].b}, ${properties[Property.Fill].a})`
  if(properties[Property.Width]) node.style.width = `${properties[Property.Width].value}${properties[Property.Width].unit}`
  if(properties[Property.Top]) node.style.top = `${properties[Property.Top].value}${properties[Property.Top].unit}`
  if(properties[Property.Left]) node.style.left = `${properties[Property.Left].value}${properties[Property.Left].unit}`
  if(properties[Property.Bottom]) node.style.bottom = `${properties[Property.Bottom].value}${properties[Property.Bottom].unit}`
  if(properties[Property.Right]) node.style.right = `${properties[Property.Right].value}${properties[Property.Right].unit}`
}

function animateElements(convertedScenes, computed) {
  convertedScenes.map((s) => {
    s.animations.map((a) => {
      const node = computed[s.key].animations[a.key].node
      const properties = computeAnimationProperties(a.steps)
      setCssProperties(node, properties)
    })
  })
}

function run(convertedScenes, computed) {
  Frame.requestAnimationFrame()(function() {
    if(scrollTop() >= 0 && scrollTop() <= animHeight) {
      animateElements(convertedScenes, computed)
    }
    run(convertedScenes, computed)
  })
}

export default {
  init: setup
}
export { Color, Timing }

window.scrollx = {
  init: setup,
  Color: Color,
  Timing: Timing
}
