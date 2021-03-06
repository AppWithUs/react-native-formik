import React from "react";
import { compose, mapProps } from "recompose";
import PropTypes from "prop-types";
import { isArray } from "lodash";
import withFormik from "./withFormik";

const withNextInputAutoFocusContextType = {
  setInput: PropTypes.func,
  handleSubmitEditing: PropTypes.func,
  getReturnKeyType: PropTypes.func
};

getInputs = children =>
  (isArray(children) ? children : [children]).filter(child => !!child).reduce((partialInputs, child) => {
    if (child.props && child.props.children) {
      return partialInputs.concat(getInputs(child.props.children));
    }
    if (child && child.props && !!child.props.name) return partialInputs.concat(child);
    return partialInputs;
  }, []);

export const withNextInputAutoFocusForm = WrappedComponent => {
  class WithNextInputAutoFocusForm extends React.PureComponent {
    static childContextTypes = withNextInputAutoFocusContextType;
    static contextTypes = { formik: PropTypes.object };

    constructor(props) {
      super(props);
      const { children } = props;
      this.inputs = getInputs(children);
    }

    inputs;
    inputNameMap;
    inputRefs = {};

    componentWillReceiveProps(nextProps) {
      const nonEmptyChildrenOld = this.props.children && this.props.children.filter(child => !!child);
      const nonEmptyChildrenNew = nextProps.children && nextProps.children.filter(child => !!child);
      if (nonEmptyChildrenNew && nonEmptyChildrenOld && (nonEmptyChildrenNew.length !== nonEmptyChildrenOld.length)) {
        this.inputs = getInputs(nextProps.children);
      }
    }

    getInputPosition = name =>
      this.inputs.findIndex(input => input.props.name === name);

    getChildContext = () => ({
      setInput: (name, component) => {
        this.inputRefs[name] = component;
      },
      handleSubmitEditing: name => {
        const inputPosition = this.getInputPosition(name);
        const isLastInput = inputPosition === this.inputs.length - 1;

        if (isLastInput) {
          this.context.formik.submitForm();
        } else {
          const nextInputs = this.inputs.slice(inputPosition + 1);
          const nextFocusableInput = nextInputs.find(
            element =>
              this.inputRefs[element.props.name] &&
              this.inputRefs[element.props.name].focus
          );
          this.inputRefs[nextFocusableInput.props.name].focus();
        }
      },
      getReturnKeyType: name => {
        const inputPosition = this.getInputPosition(name);
        const isLastInput = inputPosition === this.inputs.length - 1;

        return isLastInput ? "done" : "next";
      }
    });

    render() {
      return <WrappedComponent {...this.props} />;
    }
  }

  return WithNextInputAutoFocusForm;
};

export const withNextInputAutoFocusInput = Input => {
  class WithNextInputAutoFocusInput extends React.Component<
    $FlowFixMeProps,
    $FlowFixMeState
  > {
    static contextTypes = withNextInputAutoFocusContextType;

    setInput = component => {
      this.context.setInput(this.props.name, component);
    };

    onSubmitEditing = () => {
      this.context.handleSubmitEditing(this.props.name);
      if (this.props.onSubmitEditing) this.props.onSubmitEditing();
    };

    render() {
      const { getReturnKeyType } = this.context;
      const { name } = this.props;

      return (
        <Input
          returnKeyType={getReturnKeyType(name)}
          {...this.props}
          ref={this.setInput}
          onSubmitEditing={this.onSubmitEditing}
        />
      );
    }
  }

  return WithNextInputAutoFocusInput;
};
