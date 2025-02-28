import React, { Component } from 'react';
import { Text } from 'react-native';

interface ErrorBoundaryProps {
// Suggested code may be subject to a license. Learn more: ~LicenseLog:4026033020.
    children: React.ReactNode;
}

export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by ErrorBoundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return <Text>Something went wrong.</Text>;
        }
        return this.props.children;
    }
}

export default ErrorBoundary;