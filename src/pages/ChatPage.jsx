import React, { useState, useEffect, useRef } from 'react';
    import { useParams, useNavigate } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { motion } from 'framer-motion';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { useData } from '@/contexts/DataContext';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
    import { ArrowLeft, Send, Paperclip } from 'lucide-react';
    import { format } from 'date-fns';
    import { useSound } from '@/hooks/useSound';

    const ChatPage = () => {
      const { caseId } = useParams();
      const navigate = useNavigate();
      const { user } = useAuth();
      const { cases, users, proposals, getMessagesForCase, sendMessage, messages: allMessages } = useData();
      
      const [caseDetails, setCaseDetails] = useState(null);
      const [otherUser, setOtherUser] = useState(null);
      const [messages, setMessages] = useState([]);
      const [newMessage, setNewMessage] = useState('');
      const messagesEndRef = useRef(null);
      const playNotificationSound = useSound('/notification.mp3');
      const messagesCountRef = useRef(0);

      useEffect(() => {
        const currentCase = cases.find(c => c.id === caseId);
        if (!currentCase || !user || (user.role === 'patient' && user.id !== currentCase.patient_id) || (user.role === 'doctor' && !currentCase.assigned_doctor_ids?.includes(user.id))) {
          navigate('/');
          return;
        }
        setCaseDetails(currentCase);

        let partnerId = null;
        if (user.role === 'patient') {
          const chosenProposal = proposals.find(p => p.id === currentCase.chosen_proposal_id);
          if (chosenProposal) {
            partnerId = chosenProposal.doctor_id;
          }
        } else if (user.role === 'doctor') {
          partnerId = currentCase.patient_id;
        }
        
        const partner = users.find(u => u.id === partnerId);
        setOtherUser(partner);

        const caseMessages = getMessagesForCase(caseId);
        setMessages(caseMessages);
        messagesCountRef.current = caseMessages.length;
      }, [caseId, cases, users, proposals, user, navigate, getMessagesForCase]);

      useEffect(() => {
        const caseMessages = getMessagesForCase(caseId);
        if (caseMessages.length > messagesCountRef.current) {
          const lastMessage = caseMessages[caseMessages.length - 1];
          if (lastMessage && lastMessage.sender_id !== user.id) {
            playNotificationSound();
          }
        }
        setMessages(caseMessages);
        messagesCountRef.current = caseMessages.length;
      }, [allMessages, caseId, user, getMessagesForCase, playNotificationSound]);

      useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, [messages]);

      const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !otherUser) return;

        const messageData = {
          caseId,
          senderId: user.id,
          receiverId: otherUser.id,
          text: newMessage,
        };
        
        const tempId = `temp_${Date.now()}`;
        const optimisticMessage = {
          id: tempId,
          case_id: caseId,
          sender_id: user.id,
          content: newMessage,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage('');

        const sentMessage = await sendMessage(messageData);
        if (sentMessage) {
          setMessages(prev => prev.map(m => m.id === tempId ? sentMessage : m));
        } else {
          setMessages(prev => prev.filter(m => m.id !== tempId));
        }
      };

      if (!caseDetails || !otherUser) {
        return <div className="flex justify-center items-center h-screen">Loading chat...</div>;
      }

      return (
        <>
          <Helmet>
            <title>Chat for Case {caseDetails.id} - DentaLink</title>
            <meta name="description" content={`Chat with ${otherUser.name} regarding your case.`} />
          </Helmet>
          <div className="h-screen flex flex-col bg-gray-100 p-4">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="flex flex-col flex-grow shadow-2xl max-h-[calc(100vh-2rem)]">
                <CardHeader className="flex-shrink-0 bg-white border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <Avatar>
                        <AvatarImage src={otherUser.avatar} />
                        <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{otherUser.name}</CardTitle>
                        <p className="text-sm text-gray-500">Regarding Case: {caseDetails.title}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow p-6 overflow-y-auto">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex items-end gap-2 ${msg.sender_id === user.id ? 'justify-end' : ''}`}>
                        {msg.sender_id !== user.id && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={otherUser.avatar} />
                            <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.sender_id === user.id ? 'bg-primary text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                          <p className="text-sm">{msg.content}</p>
                          {msg.timestamp && (
                            <p className={`text-xs mt-1 ${msg.sender_id === user.id ? 'text-blue-200' : 'text-gray-500'}`}>
                              {format(new Date(msg.timestamp), 'p')}
                            </p>
                          )}
                        </div>
                         {msg.sender_id === user.id && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </CardContent>
                <div className="border-t p-4 bg-white">
                  <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon" type="button">
                      <Paperclip className="h-5 w-5 text-gray-500" />
                    </Button>
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-grow"
                      autoComplete="off"
                    />
                    <Button type="submit" size="icon" className="gradient-bg text-white">
                      <Send className="h-5 w-5" />
                    </Button>
                  </form>
                </div>
              </Card>
            </motion.div>
          </div>
        </>
      );
    };

    export default ChatPage;