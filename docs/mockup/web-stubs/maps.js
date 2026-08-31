/** react-native-maps has no web build; the mockup renders the map slot empty. */
const React = require('react');
const { View } = require('react-native');
const Stub = (props) => React.createElement(View, props, props.children);
module.exports = Stub;
module.exports.default = Stub;
module.exports.Marker = Stub;
module.exports.Circle = Stub;
module.exports.PROVIDER_GOOGLE = 'google';
